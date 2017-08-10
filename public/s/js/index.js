// Note: this file doesn't use any new ES6 features, nor is it transpiled using Babel or anything else. We're aiming
// for something that supports all browsers. We don't need a huge amount of code so we're just going to make it small,
// simple, and reliable. Hope that is okay with you. (Oh, and we're using jQuery - deal with it!) :)

$(function() {
  // enable the buttons now that everything has loaded
  $('.js-donate').prop('disabled', false);
  $('.js-subscribe').prop('disabled', false);
  var $form = $('#js-form');

  var handler = StripeCheckout.configure({
    image   : 'https://stripe.com/img/documentation/checkout/marketplace.png',
    locale  : 'auto',
    zipCode : true,
    token   : function(token) {
      // then, find all the hidden inputs we want to send (if not there, then we can't populate it)
      $form.find("input[name='token_id']").first().val(token.id)
      $form.find("input[name='type']").first().val(token.type)
      $form.find("input[name='email']").first().val(token.email)
      $form.find("input[name='client_ip']").first().val(token.client_ip)

      // finally, submit the form which will post to `/donate` and we can go from there on the server
      $form.submit();
    }
  })

  function complete($el) {
    // disable the button for a few seconds so the user can't click it again
    $el.prop('disabled', true);
    setTimeout(function() {
      $el.prop('disabled', false);
    }, 3000);

    // get the form and set it's action to either `/donate` or `/subscribe`
    $form.attr('action', $el.data('action'))

    // set the amount/plan in the form - since the token doesn't give this back to us later
    $form.find("input[name='amount']").first().val($el.data('amount'))
    $form.find("input[name='plan']").first().val($el.data('plan'))

    // Open Checkout with further options:
    handler.open({
      name            : $el.data('name'),
      description     : $el.data('description'),
      currency        : $el.data('currency'),
      amount          : $el.data('amount'),
      panelLabel      : $el.data('panel-label'),
      allowRememberMe : $el.data('allow-remember-me'),
      key             : $el.data('key'),
    });
  }

  // Listen to clicks on the donate buttons so we can do a custom integration.
  //
  // Ref : https://stripe.com/docs/checkout#integration-custom
  $('.js-donate, .js-subscribe').on('click', function(ev) {
    ev.preventDefault();

    // complete the Stripe popup
    var $el = $(this);
    complete($el);
  });

  // when the window unloads, close the handler
  $(window).on('unload', function() {
    console.log('unload');
    handler.close();
  });

});
