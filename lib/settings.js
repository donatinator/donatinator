// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const validate = require('validate.js')

// --------------------------------------------------------------------------------------------------------------------

const types = {

  // normalise just gives easier access to some simple normalisation routines
  normalise : {
    trim(v) {
      return v.trim()
    },
    currency(v) {
      return v.trim().toUpperCase()
    },
  },

  // validify the raw input
  validify : {
    string(v) {
      return true
    },
    integer(v) {
      return !!v.trim().match(/^[+-]?\d+$/)
    },
    url(v) {
      return validate({ url : v }, { url : { url : true }})
    },
    secureUrl(v) {
      return validate(
        { url : v },
        { url : { schemes : [ "https" ] } }
      )
    },
    currency(v) {
      // should be three letters
      return !!v.match(/^[A-Z]{3}$/)
    }
  },

}

const settings = {

  // list the sinple key/value pairs we allow
  simple : {

    // the splash image shows at the top of the front page
    splashImage : {
      title     : 'Splash Image',
      type      : 'url',
      desc      : 'The URL of the image shown on the front page.',
      help      : 'We recommend using an image hosting service such as <a href="https://postimages.org/">postimg.org</a> or <a href="https://imgur.com/">imgur.com</a>.',
      default   : 'https://s3.postimg.org/qa57kzblf/pexels-photo-117403.jpg',
      normalise : types.normalise.trim,
      validify  : types.validify.secureUrl,
      required  : false,
    },

    // currency is what to accept donations in
    currency : {
      title     : 'Currency',
      type      : 'string', // how do we validate this is correct?
      desc      : 'The three letter code of the currency you wish to accept.',
      help      : 'This <strong>must</strong> be a valid code that Stripe accepts. e.g. three uppercase letters such as <code>USD</code>, <code>GBP</code>, or <code>NZD</code>. See <a href="https://stripe.com/docs/currencies">https://stripe.com/docs/currencies</a>.',
      default   : 'usd',
      normalise : types.normalise.currency,
      validify  : types.validify.currency,
      required  : true,
    },

    // ToDo: an 'integer' type (when we know of one) so we can test it's conversion/validation

  },

}

// --------------------------------------------------------------------------------------------------------------------

module.exports = settings

// --------------------------------------------------------------------------------------------------------------------
