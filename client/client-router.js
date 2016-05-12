

// Router.route('/',function (){
//   this.render('chart');
//   this.layout('main_layout');
// });


Router.map(function() {
  this.route('chart', {
    path: '/',
    template: 'app_ui',
    layout: 'main_layout',
    waitOn: function() {
      return Meteor.subscribe('stocks_db');
    },
    cache: true,
  });
});

// Template.chart.helper({
//   'subscriptionsReady' : function () {
//     return Template.chart.subscriptionsReady;
//   }
// });


Router.configure({
    loadingTemplate: 'loading',
    notFoundTemplate: 'loading',
    layoutTemplate: 'main_layout'
});

// ---------- amChart example ----------

Router.route('/chart_click_example', function () {
  this.render('click_example');
  this.layout('chart_layout');
});

Router.route('/example1', function () {
  this.render('example1');
  this.layout('chart_layout');
});

Router.route('/example2', function () {
  this.render('example2');
  this.layout('chart_layout');
});

Router.route('/example3', function () {
  this.render('example3');
  this.layout('chart_layout');
});

// Router.route('/', function () {
//   this.render('home');
//   this.layout('chart_layout');
// });