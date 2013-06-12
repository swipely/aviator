Navigatorade

Navigator is a single-page front-end router built for modularity.

Routes are configured in one file.  You specify as many route handlers (responders) as you'd like. The goals are:

- a singleton Navigator object that knows how to dispatch the routes
- back/forward navigation via push state or hash urls
- bookmarkable pages
- a sensible params object for named params and query params

navigatorade.js
---

Where the routing logic lives. Parses the routes.js file, calls the proper methods on the responders.
Exposes three methods:

```map```       parses the config object specified in routes.js
```dispatch```  makes the routes go pew pew
```navigate```  routes a given path

routes.js
---

A (mostly) config file, that calls ```Navigator.map()```, passing an object that represents all routes within the app.  The object is nested to represent different parts of the url:

```
{
  '/marketing': {

    '/campaigns': {

    }
  }
}
```

Keys in the object are either strings that represent routes, or a special key called responder whose value points to a responder constructor function.

Responders are objects that handle the route changes. They have methods that correspond to the values of the other elements in that level of the routes object.

```
{
  '/campaigns': {

    responder: CampaignsResponder,

    '/': 'index',

    '/add': 'add'
  }

}
```

In the above case, hitting ```/campaigns/add``` would call the add method on the dispatcher's instance of the MarketingResponder.

The special key ```/*``` indicates a method on that responder to be called before any other route handler methods on that level and any subsequent levels in the object.

With the config below:

```
{
  '/partners': {

    responder: PartnersResponder

    '/*': 'show'

    '/marketing': {

      responder: MarketingResponder,

      '/*': 'show',

      '/': 'index',

      '/campaigns': {

        responder: CampaignsResponder,

        '/': 'index',

        '/add': 'add'

      }
    }
  }
}
```

Hitting the url ```/partners/marketing``` calls

1) ```partnersResponder#show```
2) ```marketingResponder#show```
3) ```marketingResponder#index```

Hitting the url ```/partners/marketing/campaigns/add``` calls

1) ```partnersResponder#show```
2) ```marketingResponder#show```
3) ```campaignsResponder#add```

Instead of a method name string, the value of a route key can be an object with a method name and options:

```
'/marketing': {

  responder: MarketingResponder,

  '/*': 'show',

  '/reputation': {

    responder: ReputationResponder,

    '/': { method: 'show', options: { renderMarketingLayout: false } }
  }
}
```

Upon hitting ```/marketing/reputation```, ```marketingResponder#show``` and ```reputationResponder#show``` will be called in that order, and both will be passed the options object.
