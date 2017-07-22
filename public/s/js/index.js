// Note: this file doesn't use any new ES6 features, nor is it transpiled using Babel or anything else. We're aiming
// for something that supports all browsers. We don't need a huge amount of code so we're just going to make it small,
// simple, and reliable. Hope that is okay with you. (Oh, and we're using jQuery - deal with it!) :)

$(function() {
  console.log('Ready');

  // enable the buttons now that everything has loaded
  $('.js-single').prop('disabled', false);

  var handler = StripeCheckout.configure({
    key     : 'pk_test_ZjNAyuQFJ3P1ZN23TCX1xBBn',
    image   : 'https://stripe.com/img/documentation/checkout/marketplace.png',
    locale  : 'auto',
    zipCode : true,
    token   : function(token) {
      // You can access the token ID with `token.id`.
      // Get the token ID to your server-side code for use.
      console.log('token:', token)

      // get hold of the hidden "Single Donation" form on the page and submit it
      var $form = $('#js-form-single');
      console.log('$form:', $form)

      console.log('$form.email:', $form.find("input[name='email']"))
      console.log('$form.token:', $form.find("input[name='token']"))
      console.log('$form.tokenType:', $form.find("input[name='tokenType']"))

      // then, find all the hidden inputs we want to send (if not there, then we can't populate it)
      $form.find("input[name='email']").first().val(token.email)
      $form.find("input[name='token']").first().val(token.id)
      $form.find("input[name='tokenType']").first().val(token.type)

      // finally, submit the form which will post to `/donate` and we can go from there on the server
      setTimeout(function() {
        console.log($form);
        $form.submit();
      }, 1000);
    }
  })

  console.log($('.js-single'));

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

    console.log('clicked');

    // set the amount in the form
    var $form = $('#js-form-single');
    $form.find("input[name='amount']").first().val($el.data('amount'))

    // Open Checkout with further options:
    handler.open({
      name        : $el.data('name'),
      description : $el.data('description'),
      amount      : $el.data('amount'),
      panelLabel  : $el.data('panel-label'),
    });

  });

});
