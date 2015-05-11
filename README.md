![Aviator](https://s3.amazonaws.com/swipely-pub/public-images/aviator-logo.png)

Aviator is a front-end router built for modular single page applications.

You tell Aviator what parts of your application should handle what routes. It sends requests to the right place.

Aviator:

* has a central, declarative place to define your routes
* doesn't care what framework you use
* supports push state and hash url routing
* builds a simple yet rich request object with named and query params
* supports nesting routes and passing special options to certain urls
* lets you edit the url to trigger changes or update it silently to keep state


[![Build Status](https://travis-ci.org/swipely/aviator.png)](https://travis-ci.org/swipely/aviator)

## API

Aviator exposes a small API:

* `setRoutes`: parses the routes config object
* `dispatch`: makes the routes go pew pew
* `navigate`: routes a given path
* `refresh`: re-dispatches the current URI
* `getCurrentURI`: get the currently matched URI
* `getCurrentRequest`: get the currently matched Request
* `hrefFor`: generate a route for the given path

### Configuration properties

overwrite to customize

* `pushStateEnabled`: Route via pushState or hashchange. Defaults to feature detection.
* `linkSelector`: clicks on elements that matches this selector is hijacked
                  and routed using the href attribute. Default it is `"a.navigate"`
* `root`: All routing will done on top of the `root`. Default it is `""`

### `Aviator.setRoutes`

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
or a special key called `target`. The value of this key is an object
that accepts and responds to urls.

Targets are objects that handle the route changes.
They have methods that correspond to the values of the other elements in
that level of the routes object.

```javascript
Aviator.setRoutes({
  '/campaigns': {
    target: CampaignsTarget,
    '/': 'index',
    '/add': 'add'
  }
});
```

In the above case, hitting `"/campaigns/add"` would call the add method on
the on the CampaignsTarget.

The special key `/*` indicates a method on that target to be called
before any other route handler methods on that level and any
subsequent levels in the object.

With the config below:

```javascript
Aviator.setRoutes({
  '/partners': {
    target: PartnersTarget
    '/*': 'show'
    '/marketing': {
      target: MarketingTarget,
      '/*': 'show',
      '/': 'index',
      '/campaigns': {
        target: CampaignsTarget
        '/': 'index',
        '/add': 'add'
      }
    }
  }
});
```

Hitting the url `"/partners/marketing"` calls

1. `partnersTarget#show`
2. `marketingTarget#show`
3. `marketingTarget#index`

Hitting the url `"/partners/marketing/campaigns/add"` calls

1. `partnersTarget#show`
2. `marketingTarget#show`
3. `campaignsTarget#add`

Instead of a method name string, the value of a route key can be
an object with a method name and options:

```javascript
Aviator.setRoutes({
  '/marketing': {
    target: MarketingTarget,
    '/*': 'show',
    '/reputation': {
      target: ReputationTarget,
      '/': { method: 'show', options: { renderMarketingLayout: false } }
    }
  }
});
```

Upon hitting `"/marketing/reputation"`,
`marketingTarget#show` and `reputationTarget#show`
will be called in that order, and both will be passed the options object.


#### Not Found Handlers

Aviator allows you to specify a method to be called when no route matches via
the `notFound` key. Much like normal routes, these can be added on a
scope-by-scope basis. When a route cannot be found, only the `/*` matcher, and
the `notFound` of the nearest scope will be called. Here is an example
configuration.

```javascript
Aviator.setRoutes({
  '/marketing': {
    target: MarketingTarget,
    '/*': 'show',
    '/reputation': {
      target: ReputationTarget,
      '/': { method: 'show', options: { renderMarketingLayout: false } }
    },
    notFound: 'notFound'
  }
});
```

Hitting either `/marketing/bad-route/` or `/marketing/reputation/bad-route/`
will call the `MarketingTarget.show` and `MarketingTarget.notFound` methods.
However, hitting `/bad-route/` will call nothing unless a `notFound` matcher
is found in the root context.

#### namedParams

```javascript
Aviator.setRoutes({
  '/users': {
    target: UsersTarget,
      '/:id': {
        '/edit': 'edit'
      }
    }
  }
});
```

The above config will match urls like '/users/32/edit' or '/users/hojberg/edit'
and pass in '32' or 'hojberg' respectively as a param in the Request's
namedParam hash (first argument passed to actions). Access them like so:
`request.namedParams.id` in the edit function of UsersTarget, where `request`
is the first argument.

### `Aviator.dispatch`

After having setup routes via `Aviator.setRoutes`,
call `Aviator.dispatch` to get things going,
and start listening for routing events.

No matter how many times this is called it will only setup listeners for
route events once.

Dispatch also sets up a click event handler that will pick up links matching
the selector that was set in `linkSelector` and route to its `href`
attribute instead of forcing a full page load.

### What an action on a target receives

When a action is called on the target, it is passed a Request object and a
simple options hash. The Request object includes `namedParams`, `queryParams`,
`params` (combined named and query params), `matchedRouted`,and `uri`. The
options hash is constructed from any options defined in setRoutes that matches
the current route.

### `Aviator.navigate`

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

If you wish to replace the history item instead pushing to the history list
call `navigate` with the replace option: `Aviator.navigate('/users/all', { replace: true });`

Pass in the `queryParams` option that will be parsed into a queryString and added
to the navigated uri: `Aviator.navigate('/users', { queryParams: { filter: [1,2] }});` will navigate to `"/users?filter[]=1&filter[]=2"`

Pass in the `namedParams` option to interpolate params into the url before navigate to it:
`Aviator.navigate('/users/:id/edit', { namedParams: { id: 3 });` will navigate to `"/users/3/edit"`

If you wish to change the url, but not have it call the route target, pass in `{ silent: true }` like so
`Aviator.navigate('/users', { silent: true });`

### `Aviator.hrefFor`

This function accepts a URI and an optional object with the same queryParams and namedParams as `Aviator.navigate`.
It returns a String that can be used to link to that path.

For example, calling `Aviator.hrefFor('/users/:id/edit', { namedParams: { id: 3 }, queryParams: { force: true } })`
will generate the String `'/users/3/edit?force=true'`.

This can be used in conjection with the `a.navigate` link selector to declarativly create links.
The below JSX snippet creates an `<a>` element that links to `/home/?loggedIn=false`.

```jsx
  <a className='navigate', href={Aviator.hrefFor('/home/', { queryParams: { loggedIn: false } })}>
    Home
  </a>
```

### `Aviator.refresh`

re-dispatch the current uri

## Browser support

Aviator supports modern browsers: IE9+, Chrome, Safari, Firefox, Opera

## Build aviator.js

Aviator uses browserify to combine modules. Run `grunt build` to create aviator.js

## Tests

Aviator uses Jasmine specs. They can be run from the cli:

```
grunt test
```

Or in your browser via a simple http server:
```
grunt jasmine:all:build
open http://localhost:8000/_SpecRunner.html && python -m SimpleHTTPServer
```

## Authors
Simon Højberg (hojberg), Bart Flaherty (flahertyb), and Barnaby Claydon (barnabyc)

Logo by Adam Hunter Peck
