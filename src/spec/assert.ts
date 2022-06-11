import { ElementHandle, JSHandle } from 'puppeteer'

// The below assertions are ported from chai-jquery and rewritten to work in the context of a puppeteer session.

function registerAssertProperty(
  prop: string,
  domProp: string | null,
  description: string,
  assertion: Chai.AssertionStatic,
  { flag, inspect }: Chai.ChaiUtils
) {
  assertion.addMethod(prop, async function (name: string, val: any): Promise<any> {
    const $el = flag(this, 'object') as ElementHandle<any>
    const property = await $el.getProperty(domProp ?? name)
    let value: JSHandle<any>

    // If domProp is specified, it's a nested query, otherwise we just use the name directly on the object
    if (domProp) {
      value = await property.getProperty(name)
    } else {
      value = property
    }

    // Marshal the value from the browser to this NodeJS process for use in the assertion check
    let actual: any
    try {
      actual = await value.jsonValue()
    } catch (err) {
      // We can only marshal values over that are JSON-representable, so this isn't strictly compatible with the
      // original assertion in chai-jquery that has the benefit of working within a browser environment
      actual = undefined
    }

    if (!flag(this, 'negate') || actual === undefined) {
      this.assert(
        actual !== undefined,
        'expected #{this} to have a #{exp} ' + description,
        'expected #{this} not to have a #{exp} ' + description,
        name
      )
    }

    if (val !== undefined) {
      this.assert(
        val === actual,
        'expected #{this} to have a ' +
          inspect(name) +
          ' ' +
          description +
          ' with the value #{exp}, but the value was #{act}',
        'expected #{this} not to have a ' + inspect(name) + ' ' + description + ' with the value #{act}',
        val,
        actual
      )
    }

    flag(this, 'object', actual)
  })
}

// Data is stubbed since it's jQuery-specific functionality, and we don't have jQuery in our environment
function registerAssertData(assertion: Chai.AssertionStatic, { inspect }: Chai.ChaiUtils) {
  assertion.addMethod('data', function (name, val) {
    this.assert(
      false,
      'expected #{this} to have a ' + inspect(name) + ' with the value #{exp}, but the value was #{act}',
      'expected #{this} not to have a ' + inspect(name) + ' with the value #{act}',
      val,
      undefined
    )
  })
}

function registerAssertClass(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('class', async function (expectedClassname) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const classNamesHandle = await $el.getProperty('className')
    const classNameString = ((await classNamesHandle.jsonValue()) as string | undefined | null) ?? ''
    const classNames = new Set(classNameString.split(' ').filter((v) => !!v.trim()))

    this.assert(
      classNames.has(expectedClassname),
      'expected #{this} to have class #{exp}',
      'expected #{this} not to have class #{exp}',
      expectedClassname
    )
  })
}

function registerAssertId(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('class', async function (expectedId) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const idHandle = await $el.getProperty('className')
    const id = ((await idHandle.jsonValue()) as string | undefined | null) ?? ''

    this.assert(
      id === expectedId,
      'expected #{this} to have id #{exp}',
      'expected #{this} not to have id #{exp}',
      expectedId
    )
  })
}

function registerAssertHtml(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('html', async function (expectedHtml) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const htmlHandle = await $el.getProperty('innerHTML')
    const html = ((await htmlHandle.jsonValue()) as string | undefined | null) ?? ''

    this.assert(
      html === expectedHtml,
      'expected #{this} to have HTML #{exp}, but the HTML was #{act}',
      'expected #{this} not to have HTML #{exp}',
      expectedHtml
    )
  })
}

function registerAssertText(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('text', async function (expectedText) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const textHandle = await $el.getProperty('innerText')
    const text = ((await textHandle.jsonValue()) as string | undefined | null) ?? ''

    this.assert(
      text === expectedText,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      expectedText
    )
  })
}

function registerAssertValue(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('value', async function (expectedValue) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const valueHandle = await $el.getProperty('value')
    const value = ((await valueHandle.jsonValue()) as string | undefined | null) ?? ''

    this.assert(
      value === expectedValue,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      expectedValue
    )
  })
}

function registerAssertDescendants(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('descendants', async function (selector) {
    const $el = flag(this, 'object') as ElementHandle<any>
    let $anyNode: ElementHandle<any> | undefined | null

    try {
      await $el.$eval(selector, ($node) => {
        $anyNode = $node
      })
    } catch (err) {
      this.assert(false, 'expected #{this} to have #{exp}', 'expected #{this} not to have #{exp}', selector)
      return
    }

    this.assert(!!$anyNode, 'expected #{this} to have #{exp}', 'expected #{this} not to have #{exp}', selector)
  })
}

// Focus is stubbed as it's a pain in the butt to implement when we're not in the browser. TBD.
function registerAssertFocus(assertion: Chai.AssertionStatic) {
  assertion.addMethod('focus', function () {
    this.assert(false, 'expected #{this} to have focus', 'expected #{this} not to have focus', undefined)
  })
}

function registerAssertVisible(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('visible', async function (expectedValue) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const actual: boolean = (await $el.evaluate(function (elem: any) {
      return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)
    })) as unknown as boolean

    this.assert(actual, 'expected #{this} to be visible', 'expected #{this} not to be visible', true)
  })
}

function registerAssertHidden(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('hidden', async function (expectedValue) {
    const $el = flag(this, 'object') as ElementHandle<any>
    const actual: boolean = (await $el.evaluate(function (elem: any) {
      return !(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)
    })) as unknown as boolean

    this.assert(actual, 'expected #{this} to be hidden', 'expected #{this} not to be hidden', true)
  })
}

function registerAssertSelected(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('selected', async function () {
    const $el = flag(this, 'object') as ElementHandle<any>
    const selectedHandle = await $el.getProperty('selected')
    const selected = ((await selectedHandle.jsonValue()) as boolean | undefined | null) ?? false

    this.assert(
      selected,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      true
    )
  })
}

function registerAssertChecked(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('checked', async function () {
    const $el = flag(this, 'object') as ElementHandle<any>
    const checkedHandle = await $el.getProperty('checked')
    const checked = ((await checkedHandle.jsonValue()) as boolean | undefined | null) ?? false

    this.assert(
      checked,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      true
    )
  })
}

function registerAssertDisabled(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('disabled', async function () {
    const $el = flag(this, 'object') as ElementHandle<any>
    const disabledHandle = await $el.getProperty('disabled')
    const disabled = ((await disabledHandle.jsonValue()) as boolean | undefined | null) ?? false

    this.assert(
      disabled,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      true
    )
  })
}

function registerAssertEnabled(assertion: Chai.AssertionStatic, { flag }: Chai.ChaiUtils) {
  assertion.addMethod('enabled', async function () {
    const $el = flag(this, 'object') as ElementHandle<any>
    const disabledHandle = await $el.getProperty('disabled')
    const disabled = ((await disabledHandle.jsonValue()) as boolean | undefined | null) ?? false

    this.assert(
      !disabled,
      'expected #{this} to have text #{exp}, but the text was #{act}',
      'expected #{this} not to have text #{exp}',
      true
    )
  })
}

export default function injectAdditionalAssertions(
  chai: Chai.ChaiStatic,
  assertion: Chai.AssertionStatic,
  util: Chai.ChaiUtils
) {
  registerAssertProperty('attr', 'attribute', 'attribute', assertion, util)
  registerAssertProperty('css', 'style', 'CSS property', assertion, util)
  registerAssertProperty('prop', null, 'property', assertion, util)
  registerAssertData(assertion, util)
  registerAssertClass(assertion, util)
  registerAssertId(assertion, util)
  registerAssertHtml(assertion, util)
  registerAssertText(assertion, util)
  registerAssertValue(assertion, util)
  registerAssertFocus(assertion)
  registerAssertDescendants(assertion, util)
  registerAssertVisible(assertion, util)
  registerAssertHidden(assertion, util)
  registerAssertSelected(assertion, util)
  registerAssertChecked(assertion, util)
  registerAssertDisabled(assertion, util)
  registerAssertEnabled(assertion, util)
}
