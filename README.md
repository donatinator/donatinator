# MOVED TO GITLAB #

Please see the following project for more details:

* https://gitlab.com/donatinator/donatinator

Thanks.

# The Donatinator #

Deploy a small, simple, secure site to enable you to accept one-off or recurring donations for your non-profit or
charity.

In other words, a "Donation Service".

The Donatinator is designed to be easy to use for both you and your donors.

## Design Decisions ##

* small - we keep a concise set of features so that we can be solid and stable - collecting donations is important for
  you and you don't want a large service breaking frequently.

* simple - due to it's small footprint and simple needs, the Donatinator can run on many free hosting platforms such as
  Heroku, Google App Engine, OpenShift, and many more.

* secure - you can run this server on many hosting platforms which provide a free plan. I don't believe charities and
  non-profits have enough money to pay someone else for this kind of service, especially a per transaction fee.

The reason why we think deploying a server such as the Donatinator gives you these advantages:

* No need to move from your current hosting provider (such as Weebly, Wix, SquareSpace) - you can still use them for
  you Content Management System.

* You do not need to run any kind of hosting yourself since there are some hosting platforms out there that offer
  a free version that we can make use of.

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

## Overall Objectives ##

In many areas of this project, I have chosen a simpler solution over a more complicated solution. For example, in the
frontend we have written the small amount of JavaScript we require in ES5 and using jQuery rather than ES6 and/or React
so that we can avoid a Babel/WebPack pipeline.

As another example, we do not use an ORM for talking to the database since we only have modest requirements with few
tables and minimal numbers of queries. It is nicer, safer, and easier to reason about as a maintainer but also for new
contributors to be able to get on board too.

## Author ##

* [Andrew Chilton](https://chilts.org)
* [Twitter](https://twitter.com/andychilton)
* [GitHub](https://github.com/chilts)
* [GitLab](https://gitlab.com/chilts)

## License ##

AGPLv3.

(Ends)
