---
layout: default
---

# Get started With Aviator

Add aviator to your project

```html
<script src='.../aviator.js'></script>
```

If you prefer to host it yourself you can download from <a href='https://github.com/swipely/aviator'>GitHub</a>

Create a route target (receivers of route changes)

```javascript
var usersTarget = {
  show: function () {
    console.log('users show action');
  }
};
```

Add all routes to be handled by Aviator

```javascript
Aviator.setRoutes({
  '/users': {
    target: usersTarget,
    '/:id': 'show'
  }
});
```

Start routing with Aviator

```javascript
Aviator.dispatch();
```

Thats it <i class='icon-smiley'></i>
