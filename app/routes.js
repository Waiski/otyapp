Router.configure({
  layoutTemplate: 'layout'
});

// Accounts configuration
AccountsTemplates.configure({
    // Behavior
    enablePasswordChange: true,
    forbidClientAccountCreation: true,
    overrideLoginErrors: true,

    // Appearance
    showForgotPasswordLink: true,
    showResendVerificationEmailLink: false,

    // Client-side Validation
    showValidating: true,

    // Privacy Policy and Terms of Use
    // privacyUrl: 'privacy',

    // Redirects
    homeRoutePath: '/',
    redirectTimeout: 2000,
});

// Accounts routes
AccountsTemplates.configureRoute('signIn', {
    name: 'signin',
    path: '/login'
});

// TODO: set document titles for accounts-related stuff

AccountsTemplates.configureRoute('changePwd');
AccountsTemplates.configureRoute('forgotPwd');
AccountsTemplates.configureRoute('resetPwd');

// Protect non-account-related pages.
Router.plugin('ensureSignedIn', {
  except: _.pluck(AccountsTemplates.routes, 'name').concat([
    // No public routes at this point
  ])
});

var resetSession = function() {
  // If returning from editing, ensure that editmode is not preserved
  Session.set('editMode', false);
  Session.set('addDrink', false);
  Session.set('search', '');
  Session.set('edit', undefined);
};

Router.route('/', {
  name: 'home',
  onBeforeAction: function() {
    Session.set('documentTitle', 'O.js - Drinks');
    Session.set('headerCenter', 'searchBar');
    resetSession();
    this.next();
  },
  action: function() {
    this.subscribe('drinks').wait();
    this.subscribe('categories').wait();
    this.subscribe('myTransactions').wait();
    this.subscribe('users').wait();
    this.render('headerTmpl', {to: 'header'});
    if (this.ready()) {
      this.render('drinksList');
    } else
      this.render('loading');
  }
});

// A global array of special routes, used so that a drink name cannot collide with any of these
// Remember to specify all these in lowercase, as the comparison is made with String.toLowerCase()
SpecialRoutes = [
  'add',
  'users',
  'tab',
  'login',
  'change-password',
  'forgot-password',
  'reset-password',
  'sign-up',
  'verify-email',
  'send-again'
];

var sendNonadminsHome = function() {
  if (!Roles.userIsInRole(Meteor.user(), 'admin')) {
    toastr.error('You need admin privileges to do this!', '403 Unauthorized');
    Router.go('home');
  }
};

Router.route('/add', {
  name: 'add',
  onBeforeAction: function() {
    Session.set('documentTitle', 'O.js - Add drink');
    Session.set('headerCenter', 'empty');
    Session.set('addDrink', true);
    Session.set('editMode', true);
    Session.set('edit', new __coffeescriptShare.Edit());
    this.next();
  },
  action: function() {
    this.subscribe("categories").wait();
    // Subscribe to drinks so that name uniqueness can be cheched in front-end
    this.subscribe('drinks').wait();
    this.render('headerTmpl', {to: 'header'});
    if (this.ready()) {
      this.render('drinkTmpl', {
        data: { addition: true }
      });
    } else
      this.render('loading');
  }
});

Router.route('/users', {
  name: 'users',
  onBeforeAction: function() {
    Session.set('documentTitle', 'O.js - Manage users');
    Session.set('headerCenter', 'searchBar');
    resetSession();
    this.next();
  },
  action: function() {
    this.subscribe('users').wait();
    this.subscribe('roles').wait();
    this.render('headerTmpl', {to: 'header'});
    if (this.ready()) {
      sendNonadminsHome();
      this.render('usersList');
    } else
      this.render('loading');
  }
});

Router.route('/tab/:userid?', {
  name: 'tab',
  onBeforeAction: function() {
    Session.set('documentTitle', 'O.js - Tab');
    Session.set('headerCenter', 'empty');
    resetSession();
    this.next();
  },
  action: function() {
    var uid = this.params.userid;
    if (!uid)
      uid = Meteor.userId();
    this.subscribe('users').wait();
    this.subscribe('transactions', uid).wait();
    this.render('headerTmpl', {to: 'header'});
    if (this.ready()) {
      var user = Meteor.users.findOne(uid);
      // Send non admins home if they try finding by userid
      if (this.params.userid)
        sendNonadminsHome();
      // Display error if user is not found
      if (!user) {
        toastr.error('User not found!');
        this.redirect('home');
      } else {
        this.render('tab', {
          data: {user: user}
        });
      }
    } else
      this.render('loading');
  }
});

// THIS MUST BE DEFINED LAST SO THAT ALL OTHER ROUTES TAKE PRECEDENCE
Router.route('/:slug', {
  name: 'drink',
  onBeforeAction: function() {
    Session.set('documentTitle', 'O.js - ' + this.params.slug);
    Session.set('headerCenter', 'empty');
    Session.set('addDrink', false);
    Session.set('activeDrinkId', undefined);
    // Don't reset editmode on reactive reruns
    Session.setDefault('editMode', false);
    this.next();
  },
  action: function() {
    if (!this.params.slug)
      this.redirect('home');
    this.subscribe('drinks').wait();
    this.subscribe('categories').wait();
    this.subscribe('myTransactions').wait();
    this.subscribe('users').wait();
    this.render('headerTmpl', {to: 'header'});
    if (this.ready())
      this.render('drinkTmpl', {
        data: { drinkName: this.params.slug }
      });
    else
      this.render('loading');
  }
});
