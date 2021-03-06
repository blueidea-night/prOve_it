

 Router.route('/',function (){
   this.render('homePage');
   this.layout('directLayout');
 });

ReadyList = {};
Router.map(function() {


  this.route('chart', {
    path: '/chart/:token',
    template: 'app_ui',
    layout: 'main_layout',
    onBeforeAction: function(){
      IRLibLoader.load('/bootstrap/bootstrap.min.js');
      ReadyList.js1 = IRLibLoader.load('/amcharts/amcharts.js');
      if(!ReadyList.js1.ready()){ return }
      ReadyList.js2 = IRLibLoader.load('/amcharts/serial.js');
      if(!ReadyList.js2.ready()){ return }
      ReadyList.js3 = IRLibLoader.load('/amcharts/themes/darkmodified.js');
      if(!ReadyList.js3.ready()){ return }
      ReadyList.js4 = IRLibLoader.load('/amcharts/amstock.js');
      if(!ReadyList.js4.ready()){ return }
      IRLibLoader.load('/amcharts/themes/light.js');
      this.next();
    },
    waitOn: function(){
      return [
        Meteor.subscribe('stockPrices_db',this.params.token),
        Meteor.subscribe('stockEvents_db',this.params.token),
        Meteor.subscribe('market_db'),
        Meteor.subscribe('regressions_db', this.params.token, function() {
          console.log(Regressions.find().count());
        }),
      ];
    },
    fastRender: true,
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

