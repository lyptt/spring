import {
  BaseNode,
  Identifier,
  LiteralExpression,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from '@typescript-eslint/types/dist/generated/ast-spec'
import { AST, parse, TSESTreeOptions } from '@typescript-eslint/typescript-estree'
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree/dist/ts-estree'
import { get } from 'lodash'

const Var = AST_NODE_TYPES.VariableDeclaration
const VarDecl = AST_NODE_TYPES.VariableDeclarator
const Call = AST_NODE_TYPES.CallExpression
const Id = AST_NODE_TYPES.Identifier
const Lit = AST_NODE_TYPES.Literal

const kp = (type: AST_NODE_TYPES, params?: Partial<IAstSelector>): IAstSelector => ({ type, ...(params ?? {}) })

interface IAstSelector {
  type: AST_NODE_TYPES
  name?: string
  index?: number
  key?: string
  value?: string
}

function select(keypath: IAstSelector[], firstNode: BaseNode, currentNode: BaseNode = firstNode): BaseNode | undefined {
  if (currentNode.type == AST_NODE_TYPES.Program) {
    // Return the first result matching the selector
    return (currentNode as Program).body.map((node) => select(keypath, node, node)).filter((node) => !!node)[0]
  }

  const [selector, nextSelector, ...remainingKeypath] = keypath

  if (selector.type !== currentNode.type) {
    return undefined
  }

  if (selector.type === Id && selector.name && (selector as Identifier).name !== selector.name) {
    return undefined
  }

  if (!nextSelector) {
    return currentNode
  }

  if (nextSelector.key) {
    return select([nextSelector, ...remainingKeypath], firstNode, get(currentNode, nextSelector.key))
  }

  switch (currentNode.type) {
    case Var:
      // Return the first result matching the selector
      return (currentNode as VariableDeclaration).declarations
        .map((node) => select([nextSelector, ...remainingKeypath], firstNode, node))
        .filter((node) => !!node)[0]
    case VarDecl:
      return [(currentNode as VariableDeclarator).id, (currentNode as VariableDeclarator).id]
        .map((node) => select([nextSelector, ...remainingKeypath], firstNode, node))
        .filter((node) => !!node)[0]
    default:
      console.warn('Unsupported node type for children discovery', currentNode.type)
      return undefined
  }
}

function findRequireModuleImport(ast: AST<TSESTreeOptions>, mod: string): BaseNode | undefined {
  // Find the first variable declaration where the value is equal to the result of calling the 'require()' function
  const requireDecl = select(
    [kp(Var), kp(VarDecl), kp(Call, { key: 'init' }), kp(Id, { key: 'callee', name: 'require' })],
    ast
  )
  if (!requireDecl) {
    return undefined
  }

  // Find the first value passed into the first require call
  const requireDecl2 = select(
    [kp(Var), kp(VarDecl), kp(Call, { key: 'init' }), kp(Lit, { key: 'arguments[0]', value: mod })],
    ast
  )

  if (!requireDecl2) {
    return undefined
  }

  return requireDecl2
}

export function rewireModuleImport(source: string, mod: string, mod2: string): string {
  const ast = parse(source, {
    loc: true,
    range: true,
  })

  const result = findRequireModuleImport(ast, mod)

  if (!result) {
    return source
  }

  const ret =
    source.substring(0, result.range[0]) + JSON.stringify(mod2) + source.substring(result.range[1], source.length)
  return ret
}
