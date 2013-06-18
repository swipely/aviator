Aviator
==================

Aviator is a single-page front-end router built for modularity.

Routes are configured in one place.
You specify as many route handlers (responders) as you'd like. The goals are:

* A singleton Navigator object that knows how to dispatch the routes
* Browser agnostic back/forward navigation and url editing via push state or hash urls
* Bookmarkable pages
* A sensible params object for named params and query params

## API

Aviator exposes a small API:

* `setRoutes`: parses the routes config object
* `dispatch`: makes the routes go pew pew
* `navigate`:  routes a given path

### Configuration properties

overwrite to customize

* `pushStateEnabled`: Route via pushState or hashchange. Defaults to feature detection.
* `linkSelector`: clicks on elements that matches this selector is hijacked
                  and routed using the href attribute. Default it is `"a.navigate"`
* `root`: All routing will done on top of the `root`. Default it is `""`

## `Aviator.setRoutes`

Pass an object that represents all routes within the app.
The object should be nested to describe different parts of the url:

```javascript
Aviator.setRoutes({
  '/marketing': {
    '/campaigns': {
    }
  }
});
```

Keys in the object are either strings that represent routes,
or a special key called `responder`. The value of this key is an object
that accepts and responds to urls.

Responders are objects that handle the route changes.
They have methods that correspond to the values of the other elements in
that level of the routes object.

```javascript
Aviator.setRoutes({
  '/campaigns': {
    responder: CampaignsResponder,
    '/': 'index',
    '/add': 'add'
  }
});
```

In the above case, hitting `"/campaigns/add"` would call the add method on
the on the MarketingResponder.

The special key `/*` indicates a method on that responder to be called
before any other route handler methods on that level and any
subsequent levels in the object.

With the config below:

```javascript
Aviator.setRoutes({
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
});
```

Hitting the url `"/partners/marketing"` calls

1. `partnersResponder#show`
2. `marketingResponder#show`
3. `marketingResponder#index`

Hitting the url `"/partners/marketing/campaigns/add"` calls

1. `partnersResponder#show`
2. `marketingResponder#show`
3. `campaignsResponder#add`

Instead of a method name string, the value of a route key can be
an object with a method name and options:

```javascript
Aviator.setRoutes({
  '/marketing': {
    responder: MarketingResponder,
    '/*': 'show',
    '/reputation': {
      responder: ReputationResponder,
      '/': { method: 'show', options: { renderMarketingLayout: false } }
    }
  }
});
```

Upon hitting `"/marketing/reputation"`,
`marketingResponder#show` and `reputationResponder#show`
will be called in that order, and both will be passed the options object.

## `Aviator.dispatch`

After having setup routes via `Aviator.setRoutes`,
call `Aviator.dispatch` to get things going,
and start listening for routing events.

No matter how many times this is called it will only setup listeners for
route events once.

Dispatch also sets up a click event handler that will pick up links matching
the selector that was set in `linkSelector` and route to its `href`
attribute instead of forcing a full page load.

## `Aviator.navigate`

After having dispatched (`Aviator.dispatch`) calling change the url and
force a routing by calling `Aviator.navigate`.

For instance calling
```javascript
Aviator.navigate('/users/all');
```
Will change the URL to `"/users/all"`. If the `root` property was set to
`"/admin"`, the same navigate call would change the url to `"/admin/users/all"`.

If the browser does not support pushState or you have set
`pushStateEnabled` to `false`, Aviator will instead take the same navigate
call and add it to `window.location.hash` so the url would
look like this `"/admin#/users/all"`.
