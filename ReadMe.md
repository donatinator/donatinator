# The Donatinator #

Deploy a small, simple, secure site to enable you to accept one-off or recurring donations for your non-profit or
charity.

The Donatinator is designed to be easy to use for both you and your donators.

## Design Decisions ##

* small - we keep a concise set of features so that we can be solid and stable - collecting donations is important for
  you and you don't want a large service breaking frequently

* simple - due to it's small footprint and simple needs, the Donatinator can run on many free hosting platforms such as
  Heroku, Google App Engine, OpenShift, and many more

* secure - you can run this server on many hosting platforms which provide a free plan. Not having to pay for hosting

The reason why we think deploying a server such as the Donatinator gives you these advantages:

* no need to move from your current hosting provider (such as Weebly, Wix, SquareSpace)
* you do not require 

## Technical Decisions ##

- Payment Processing

We're using Stripe. We may or may not ever extend to other payment processing solutions but Stripe enables us to create
and delete users using their own service, have it contained within your own Stripe account, and thus we do not require
any other 3rd party for any kind of data storage.

- Transactional Email

MailGun provides a rather generous free tier of emails sent per month and therefore you're unlikely to hit their limits
which then require payment.

- Language

Node.js is the language of many PaaS hosting sites and is well supported by both these, Stripe itself, and the larger
JavaScript community.

(Ends)
