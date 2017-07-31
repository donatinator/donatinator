// Note: this file doesn't use any new ES6 features, nor is it transpiled using Babel or anything else. We're aiming
// for something that supports all browsers. We don't need a huge amount of code so we're just going to make it small,
// simple, and reliable. Hope that is okay with you. (Oh, and we're using jQuery - deal with it!) :)

$(function() {
  // enable the buttons now that everything has loaded
  $('.js-single').prop('disabled', false);

  var handler = StripeCheckout.configure({
    key     : 'pk_test_ZjNAyuQFJ3P1ZN23TCX1xBBn',
    image   : 'https://stripe.com/img/documentation/checkout/marketplace.png',
    locale  : 'auto',
    zipCode : true,
    token   : function(token) {
      // get hold of the hidden "Single Donation" form on the page
      var $form = $('#js-form-single');

      // then, find all the hidden inputs we want to send (if not there, then we can't populate it)
      $form.find("input[name='token_id']").first().val(token.id)
      $form.find("input[name='type']").first().val(token.type)
      $form.find("input[name='email']").first().val(token.email)
      $form.find("input[name='client_ip']").first().val(token.client_ip)

      // finally, submit the form which will post to `/donate` and we can go from there on the server
      $form.submit();
    }
  })

  // Listen to clicks on the donate buttons so we can do a custom integration.
  //
  // Ref : https://stripe.com/docs/checkout#integration-custom
  $('.js-single').on('click', function(ev) {
    ev.preventDefault();
    var $el = $(this);

    // disable the button for a few seconds so the user can't click it again
    $el.prop('disabled', true);
    setTimeout(function() {
      $el.prop('disabled', false);
    }, 3000);

    // set the amount in the form - since the token doesn't give this back to us later
    var $form = $('#js-form-single');
    $form.find("input[name='amount']").first().val($el.data('amount'))

    // Open Checkout with further options:
    handler.open({
      name        : $el.data('name'),
      description : $el.data('description'),
      currency    : $el.data('currency'),
      amount      : $el.data('amount'),
      panelLabel  : $el.data('panel-label'),
    });

  });

});
