import { Meteor } from 'meteor/meteor';
import './companies.html';
import './companies.css';


Template.chart.rendered = function() {
  $('.selectpicker').selectpicker();
  $('#chart-options').hide();

  $('a[href="http://www.amcharts.com/javascript-charts/"').hide();

  var token = Router.current().params.token;
  var validToken = false;
  
  var curr_graph = 'event-study';
  var curr_company = "AAC.AX";
  var second_company = "AAC.AX";
  var curr_topic = "Cash Rate";
  var curr_upper = 5;
  var curr_lower = -5;

  Meteor.call('checkToken',token, function(err, response) {
    validToken = response;
    // console.log(response);
    if (validToken) {
      $('ul.nav-tabs li a#'+curr_graph).parent().addClass('active');
      renderMainGraph();
      // render_company_chart();
      // render_company_details();
    } else {
      alert("invalid token");
    }
  });

  // control the tabs
  $('ul.nav-tabs li a').on('click', function() {
    var currentTab = $(this);
    var tabId = currentTab.attr('id');
    $('ul.nav-tabs li').removeClass('active');
    if (tabId == 'candlesticks') {
      curr_graph = 'candlesticks';
    } else if (tabId == 'volatility') {
      curr_graph = 'volatility';
    } else if (tabId == 'event-study') {
      curr_graph = 'event-study';
    } else if (tabId == 'stock-topic') {
      curr_graph = 'stock-topic';
    }
    renderMainGraph();
    currentTab.parent().addClass('active');
    // console.log(currentTab.parent());
  });

  // control the navbar to switch between the main stock
  var choose_main_stock = $('#choose-main-stock');
  var choose_second_stock = $('#choose-second-stock');
  var choose_topic = $('#choose-topic');
  // console.log(choose_main_stock);
  Tracker.autorun(function() {
    var all_company = _.uniq(StockPrices.find({}, {fields:{company_name:1}},{sort:{company_name: 1}}).fetch().map(function(x){return x.company_name}),true);
    choose_main_stock.empty();
    choose_second_stock.empty();
    all_company.forEach(function(c){
      // console.log(c);
      choose_main_stock.append("<option>"+c+"</option>");
      choose_second_stock.append("<option>"+c+"</option>");
    });
    choose_main_stock.selectpicker('refresh');
    choose_second_stock.selectpicker('refresh');
  });

  Tracker.autorun(function() {
    var all_topics = _.uniq(StockEvents.find({token:token},{sort:{topic:1},fields:{topic:true}}).fetch().map(function(x){return x.topic}),true);
    choose_topic.empty();
    all_topics.forEach(function(c){
      choose_topic.append("<option>"+c+"</option>");
    });
    choose_topic.selectpicker('refresh');
  });

  $('#choose-upper-window').on('change',function(){
    curr_upper = $(this).val();
    console.log("upper: "+curr_upper);
    renderMainGraph();
  });

  $('#choose-lower-window').on('change',function(){
    curr_lower = $(this).val();
    console.log("lower: "+curr_lower);
    renderMainGraph();
  });

  function renderMainGraph() {
    $('#chart-options').hide();
    $('#chartdiv2').show();
    $('#chartdiv3').show();
    $('#chartdiv2').html('');
    $('#chartdiv3').html('');
    if (curr_graph == "candlesticks"){
      render_candlestick_graph(curr_company);
      render_company_details();
      render_company_chart();
    } else if (curr_graph == 'volatility'){
      $('#chartdiv2').hide();
      $('#chartdiv3').hide();
      render_volatility_chart(curr_company);
    } else if (curr_graph == 'event-study'){
      render_events_chart(curr_company, curr_topic, curr_upper, curr_lower);
      // render_company_details();
      // render_company_chart();
    } else if (curr_graph == 'stock-topic'){
      render_stock_vs_topic_graph(curr_company, curr_topic, curr_upper, curr_lower);
    }
  }

  choose_main_stock.on('change',function(){
    var c = $(this).val();
    curr_company = c;
    console.log(c);
    render_company_details();
    renderMainGraph();
  });

  choose_second_stock.on('change',function(){
    var c = $(this).val();
    second_company = c;
    console.log("second_company: "+second_company);
  });

  choose_topic.on('change', function(){
    var t = $(this).val();
    curr_topic = t;
    renderMainGraph();
  });


  function render_volatility_chart (company) {
    var stock_prices = [
      {time: 0, price: 5},
      {time: 1, price: 5.1},
      {time: 2, price: 5.3},
      {time: 3, price: 5.2},
      {time: 4, price: 4.9},
      {time: 5, price: 5.5},
      {time: 6, price: 5.6},
      {time: 7, price: 5.8},
      {time: 8, price: 5.5},
      {time: 9, price: 5.7},
      {time: 10, price: 6.1}
    ];

     Tracker.autorun(function() {

      var prices = StockPrices.find({token:token, company_name: company, flat_value: {$ne: null}},{fields:{date:true, flat_value: true}}).fetch();

      var stock_prices = [];
      prices.forEach(function(p){
        stock_prices.push({
          time: p.date,
          price: p.flat_value,
        });
      });

      var sma = [];
      var avg = 0;
      var currPrice = 0;
      var prevPrice = 0;

      //calculate standard deviation
      var toDoList = []; //array of arrays of values [[1,2],[2,3],[9,10]]
      currPrice = prevPrice = 0;

      for(var i = 0; i<(stock_prices.length); i++) {
        var currArray = [];
        if (i < 29) {
          //currArray.push(stock_prices[i].price);
        } 
        for(var x = 0; x<30; x++) {
            if (i>=29) {
              currArray.push(stock_prices[i-x].price);
            }
        }
        if (i > 29) {
          toDoList.push({"currArray": currArray, "time": stock_prices[i-30].time, "price": stock_prices[i].price});
        }
      // console.log(toDoList);
      }
      toDoList.forEach(function (c){
        var result = standardDeviation(c.currArray);
        var entry = {"time": c.time, "price": c.price, "mAvg": result[1], "sdUpper": ((result[0]*2)+result[1]), "sdLower": (result[1]-(result[0]*2)), "sd": result[0]};
        // console.log(entry);
        sma.push(entry);
      });

      drawGraph(sma,company);

     });


    function standardDeviation(values){
      var avg = average(values);
      
      var squareDiffs = values.map(function(value){
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
      });
      
      var avgSquareDiff = average(squareDiffs);

      var stdDev = Math.sqrt(avgSquareDiff);
      var result = [stdDev, avg];
      return result;
    }

    function average(data){
      var sum = 0;
      for(var i = 0; i<data.length; i++) {
        sum = sum + data[i];
      }

      var avg = sum / data.length;
      return avg;
    }

    function drawGraph(sma,company) {

      var chart = AmCharts.makeChart( "chartdiv", {
        "type": "stock",
        "theme": "light",
        "pathToImages": "/amcharts/images/",
        "autoMarginOffset": 20,
        "marginRight": 80,
        "titles": [{
          "text": "Volatility for "+ company,
          "bold": true
        },
        {
          "text": "This Volatility-Analysis tool allows you to determine the dispersion a stock price has around its average.",
          "bold": false
        }, 
        {
          "text": "This gives you an idea on the risk and reward of investing, as well as help vistually understand how unstable a stock is.",
          "bold": false
        }],
        

        "dataSets": [ {
          "fieldMappings": [ {
            "fromField": "price",
            "toField": "price"
          }, {
            "fromField": "mAvg",
            "toField": "mAvg"
          }, {
            "fromField": "sdUpper",
            "toField": "sdUpper"
          }, {
            "fromField": "sdLower",
            "toField": "sdLower"
          },{
            "fromField": "sd",
            "toField": "sd"
          }],
          "color": "orange",
          "dataProvider": sma,
          // "title": "West Stock",
          "categoryField": "time"
        }, 
        // {
        //   "fieldMappings": [ {
        //     "fromField": "sd",
        //     "toField": "sd"
        //   } ],
        //   // "color": "blue",
        //   "dataProvider": sma,
        //   "compared": true,
        //   // "title": "East Stock",
        //   "categoryField": "time"
        // } 
        ],


        "panels": [ {
          "title": "Volatility",
          "percentHeight": 30,
          "marginTop": 1,
          "showCategoryAxis": true,
          "percentHeight": 70,
          "valueAxes": [ {
            "id": "v1",
            // "dashLength": 5

            "gridColor": "#000000",
            "gridAlpha": 0.2,
            "dashLength": 10,
            "title": "Stock Price ($)",
          } ],
          "categoryField": "time",
            "categoryAxis": {
              "parseDates": true,
              "position":"top",
              // "axisAlpha": 0,
              // "minHorizontalGap": 25,
              // "gridAlpha": 0,
              // "tickLength": 0,
              // "dateFormats": [{
              //     "period": 'fff',
              //     "format": 'JJ:NN:SS'
              // }, {
              //     "period": 'ss',
              //     "format": 'JJ:NN:SS'
              // }, {
              //     "period": 'mm',
              //     "format": 'JJ:NN'
              // }, {
              //     "period": 'hh',
              //     "format": 'JJ:NN'
              // }, {
              //     "period": 'DD',
              //     "format": 'DD'
              // }, {
              //     "period": 'WW',
              //     "format": 'DD'
              // }, {
              //     "period": 'MM',
              //     "format": 'MMM'
              // }, {
              //     "period": 'YYYY',
              //     "format": 'YYYY'
              // }],
              "gridPosition": "middle",

              "gridAlpha": 0.2,
              "dashLength": 10,
              "title": "Time (Days)"
            },

            "stockGraphs": [{
              "id": "priceGraph",
              "balloonText": "Price: <b>[[price]]</b><br>Upper Band: <b>[[sdUpper]]</b><br>SMA(30): <b>[[mAvg]]</b><br>Lower Band: <b>[[sdLower]]</b>",
              "balloonFunction": function(item, graph) {
                var result = graph.balloonText;
                for (var key in item.dataContext) {
                  if (item.dataContext.hasOwnProperty(key) && !isNaN(item.dataContext[key])) {
                    var formatted = AmCharts.formatNumber(item.dataContext[key], {
                      precision: chart.precision,
                      decimalSeparator: chart.decimalSeparator,
                      thousandsSeparator: chart.thousandsSeparator
                    }, 2);
                    result = result.replace("[[" + key + "]]", formatted);
                  }
                }
                return result;
              },
              // "bullet": "round",
              "fillAlphas": 0,
              "lineAlpha": 1,
              "type": "line",
              "lineColor": "#ff6600",
              "lineThickness": 2,
              "valueField": "price",
              "title": "Stock Price",
              "labelPosition": "right",
              //"visibleInLegend": false,
              "labelFunction": labelFunction,
              //"labelText": "Stock Price"
              "useDataSetColors":false,
            }, {
              "id": "smaGraph",
              //"balloonText": "SMA(30): <b>[[value]]</b>",
              "showBalloon": false,
              "fillAlphas": 0,
              "lineAlpha": 0.8,
              "lineThickness": 2,
              "type": "line",
              "dashLength": 4,
              "lineColor": "#0077aa",
              "valueField": "mAvg",
              "title": "Bollinger Bands",
              "labelPosition": "right",
              "labelFunction": labelFunction,
              "labelText": "SMA(30)",
              "useDataSetColors":false,
            }, {
              "id": "sdUpperGraph",
              //"balloonText": "Upper Band: <b>[[value]]</b>",
              "showBalloon": false,
              "fillAlphas": 0.3,
              "fillColors": ["#ffa31a"],
              "lineAlpha": 0,
              "type": "line",
              "fillToGraph": "sdLowerGraph",
              "valueField": "sdUpper",
              "title": "UpperBand",
              "visibleInLegend": false,
              "labelPosition": "right",
              "labelFunction": labelFunction,
              "useDataSetColors":false,
              //"labelText": "Upper Band"
            }, {
              "id": "sdLowerGraph",
              //"balloonText": "Lower Band: <b>[[value]]</b>",
              "showBalloon": false,
              "fillAlphas": 0,
              "lineAlpha": 0,
              "type": "line",
              "valueField": "sdLower",
              "title": "LowerBand",
              "labelPosition": "right",
              "visibleInLegend": false,
              "labelFunction": labelFunction,
              "useDataSetColors":false,
              //"labelText": "Lower Band"
            }, {

            }],

            "stockLegend": {
              // "valueTextRegular": undefined,
              // "periodValueTextComparing": "[[percents.value.close]]%"
              "equalWidths": false,
              //"periodValueText": "total: [[value.sum]]",
              "position": "top",
              "valueAlign": "left",
              "valueWidth": 100,
              "clickMarker": handleLegendClick,
              "clickLabel": handleLegendClick

            }
          },

          {
            "title": "Standard Deviation",
            "percentHeight": 30,
            "marginTop": 1,
            "showCategoryAxis": true,
            "valueAxes": [ {
              "dashLength": 5
            } ],

            "categoryAxis": {
              "dashLength": 5
            },

            "stockGraphs": [ {
              "valueField": "sd",
              "type": "line",
              "showBalloon": false,
              "fillAlphas": 0,
              "lineColor": "#ff6600",
              "useDataSetColors":false,
            } ],

            "stockLegend": {
              "markerType": "none",
              "markerSize": 0,
              "labelText": "",
              "periodValueTextRegular": "[[sd]]"
            }
          }
        ],

        "chartScrollbarSettings": {
          "graph": "priceGraph",
          "graphType": "line",
          "usePeriod": "WW"
        },

        "chartCursorSettings": {
          "valueLineBalloonEnabled": true,
          "valueLineEnabled": true
        },

        "periodSelector": {
          "position": "bottom",
          "periods": [ {
            "period": "DD",
            "count": 10,
            "label": "10 days"
          }, {
            "period": "MM",
            selected: true,
            "count": 1,
            "label": "1 month"
          }, {
            "period": "YYYY",
            "count": 1,
            "label": "1 year"
          }, {
            "period": "YTD",
            "label": "YTD"
          }, {
            "period": "MAX",
            "label": "MAX"
          } ]
        },
        "export": {
          "enabled": true
        },
        "listeners": [{
          "event": "init",
          "method": function(event) {
            //var end = new Date(); // today
            //var start = new Date(end);
            //start.setDate(end.getDate() - 10);
            // event.chart.zoomToIndexes(event.chart.dataProvider.length - 80, event.chart.dataProvider.length - 1);
            // var graph = event.chart.getGraphById("priceGraph");
            // graph.bullet = "round";
          }
        },{
          "event": "zoomed",
          "method": function(event) {
            // console.log(event.chart.panels[0].stockGraphs.getGraphById("priceGraph"));
            // var zoomPercent = (event.endIndex - event.startIndex) / event.endIndex;
            // console.log("zoom: "+zoomPercent);
            // var graph = event.chart.getGraphById("priceGraph");
            // var chart = event.chart;
            // if (zoomPercent > 0.4){
            //   graph.bullet = "none";
            // } else {
            //   graph.bullet = "round";
            // }
          }
        }],
      });

    //   var chart = AmCharts.makeChart("chartdiv", {
    //   "type": "serial",
    //   "theme": "light",
    //   "pathToImages": "/amcharts/images/",
    //   "autoMarginOffset": 20,
    //   "marginRight": 80,
    //   "titles": [{
    //     "text": "Volatility for "+ company,
    //   }],
    //   "legend": {
    //     "equalWidths": false,
    //     //"periodValueText": "total: [[value.sum]]",
    //     "position": "top",
    //     "valueAlign": "left",
    //     "valueWidth": 100,
    //     "clickMarker": handleLegendClick,
    //     "clickLabel": handleLegendClick
    //   },
    //   "dataProvider": sma,
    //   "panels": [ 
    //     {
    //       "title": "Volatility",
    //       "percentHeight": 30,
    //       "marginTop": 1,
    //       "showCategoryAxis": true,
    //       "valueAxes": [ {
    //         "dashLength": 5
    //       } ],

    //       "categoryAxis": {
    //         "dashLength": 5
    //       },

    //       "stockGraphs": [{
    //         "valueField": "sd",
    //         "type": "line",
    //         "showBalloon": false,
    //         "fillAlphas": 1
    //       }],
    //     }
    //   ],
    //   "valueAxes": [ {
    //     "gridColor": "#000000",
    //     "gridAlpha": 0.2,
    //     "dashLength": 10,
    //     "title": "Stock Price ($)"
    //   } ],
    //   "gridAboveGraphs": true,
    //   "startDuration": 0,
    //   "graphs": [ {
    //     "id": "priceGraph",
    //     "balloonText": "Price: <b>[[price]]</b><br>Upper Band: <b>[[sdUpper]]</b><br>SMA(30): <b>[[mAvg]]</b><br>Lower Band: <b>[[sdLower]]</b>",
    //     "balloonFunction": function(item, graph) {
    //       var result = graph.balloonText;
    //       for (var key in item.dataContext) {
    //         if (item.dataContext.hasOwnProperty(key) && !isNaN(item.dataContext[key])) {
    //           var formatted = AmCharts.formatNumber(item.dataContext[key], {
    //             precision: chart.precision,
    //             decimalSeparator: chart.decimalSeparator,
    //             thousandsSeparator: chart.thousandsSeparator
    //           }, 2);
    //           result = result.replace("[[" + key + "]]", formatted);
    //         }
    //       }
    //       return result;
    //     },
    //     // "bullet": "round",
    //     "fillAlphas": 0,
    //     "lineAlpha": 1,
    //     "type": "line",
    //     "lineColor": "#ff6600",
    //     "lineThickness": 2,
    //     "valueField": "price",
    //     "title": "Stock Price",
    //     "labelPosition": "right",
    //     //"visibleInLegend": false,
    //     "labelFunction": labelFunction,
    //     //"labelText": "Stock Price"
    //   },
    //   {
    //     "id": "smaGraph",
    //     //"balloonText": "SMA(30): <b>[[value]]</b>",
    //     "showBalloon": false,
    //     "fillAlphas": 0,
    //     "lineAlpha": 0.8,
    //     "lineThickness": 2,
    //     "type": "line",
    //     "dashLength": 4,
    //     "lineColor": "#0077aa",
    //     "valueField": "mAvg",
    //     "title": "Bollinger Bands",
    //     "labelPosition": "right",
    //     "labelFunction": labelFunction,
    //     "labelText": "SMA(30)"
    //   },
    //   {
    //     "id": "sdUpperGraph",
    //     //"balloonText": "Upper Band: <b>[[value]]</b>",
    //     "showBalloon": false,
    //     "fillAlphas": 0.3,
    //     "fillColors": ["#ffa31a"],
    //     "lineAlpha": 0,
    //     "type": "line",
    //     "fillToGraph": "sdLowerGraph",
    //     "valueField": "sdUpper",
    //     "title": "UpperBand",
    //     "visibleInLegend": false,
    //     "labelPosition": "right",
    //     "labelFunction": labelFunction,
    //     //"labelText": "Upper Band"
    //   },
    //   {
    //     "id": "sdLowerGraph",
    //     //"balloonText": "Lower Band: <b>[[value]]</b>",
    //     "showBalloon": false,
    //     "fillAlphas": 0,
    //     "lineAlpha": 0,
    //     "type": "line",
    //     "valueField": "sdLower",
    //     "title": "LowerBand",
    //     "labelPosition": "right",
    //     "visibleInLegend": false,
    //     "labelFunction": labelFunction,
    //     //"labelText": "Lower Band"
    //   }],
    //   "chartCursor": {
    //     "categoryBalloonEnabled": false,
    //     "cursorAlpha": 0,
    //     "zoomable": true
    //   },
    //   "chartScrollbar": {
    //     "autoGridCount": true,
    //     "graph": "priceGraph",
    //     "scrollbarHeight": 30,
    //     "updateOnReleaseOnly": true,
    //     //"graphFillColor": "orange",
    //     "selectedGraphFillColor": "orange",
    //     "selectedGraphFillAlpha": 0.8,
    //   },
    //   "categoryField": "time",
    //   "categoryAxis": {
    //     "gridPosition": "middle",
    //     "parseDates": true,

    //     "gridAlpha": 0.2,
    //     "dashLength": 10,
    //     "title": "Time (Days)"
    //     //"tickPosition": "start",
    //     //"tickLength": 20
    //   },
    //   "listeners": [{
    //     "event": "init",
    //     "method": function(event) {
    //       //var end = new Date(); // today
    //       //var start = new Date(end);
    //       //start.setDate(end.getDate() - 10);
    //       event.chart.zoomToIndexes(event.chart.dataProvider.length - 80, event.chart.dataProvider.length - 1);
    //       var graph = event.chart.getGraphById("priceGraph");
    //       graph.bullet = "round";
    //     }},{
    //     "event": "zoomed",
    //     "method": function(event) {
    //       var zoomPercent = (event.endIndex - event.startIndex) / event.endIndex;
    //       console.log("zoom: "+zoomPercent);
    //       var graph = event.chart.getGraphById("priceGraph");
    //       var chart = event.chart;
    //       if (zoomPercent > 0.4){
    //         graph.bullet = "none";
    //       } else {
    //         graph.bullet = "round";
    //       }
    //     }}],
    //   "export": {
    //     "enabled": true
    //   }
    // }); 

  }

    function handleLegendClick( graph ) {
      var chart = graph.chart;
      var hidden = graph.hidden;
      if (graph.id == 'priceGraph') {
        if (hidden) {
          chart.showGraph(chart.graphs[0]);
        } else {
          chart.hideGraph(chart.graphs[0]);
        }
      } else {
        if (hidden) {
          chart.showGraph(chart.graphs[1]);
          chart.showGraph(chart.graphs[2]);
          chart.showGraph(chart.graphs[3]);
        } else {
          chart.hideGraph(chart.graphs[1]);
          chart.hideGraph(chart.graphs[2]);
          chart.hideGraph(chart.graphs[3]);
        }
      }
      
      // return false so that default action is canceled
      return false;
    }

    function labelFunction(item, label) {
      if (item.index === item.graph.chart.dataProvider.length - 1)
        return label;
      else
        return "";
    }

  }


  function render_stock_vs_topic_graph (company, topic, upper_range, lower_range) {
    $('#chart-options').show();
    $('#second-stock-selection').hide();

    Tracker.autorun(function() {
      var chartData = [];

      // var all_topics = _.uniq(StockEvents.find({token:token},{sort:{topic:1},fields:{topic:true}}).fetch().map(function(x){return x.topic}),true);

      var dates = _.uniq(StockEvents.find({token:token,company_name: company, topic: topic, value: {$gt: 0}},{sort:{date:1},fields: {date: true}}).fetch().map(function(x){return x.date}),true);

      for (var date = lower_range; date <= upper_range; date++) {
        var entry = {
          year: date,
        }
        dates.forEach(function (d) {
          var currDate = new Date(d.getTime());
          currDate.setDate(d.getDate()+date);
          var cr = StockPrices.findOne({token: token, company_name: company, date: currDate},{fields:{cum_return:true}});
          if (cr === undefined)
            cr = null;
          else
            cr = cr.cum_return;
          entry[d.toDateString()] = cr;
        });

        chartData.push(entry);
      }

      drawGraph(chartData,dates,company,topic);
    });





    function drawGraph (chartData,dates,company, topic) {



      var chartOptions = {
          "type": "serial",
          "theme": "light",
          "legend": {
              "useGraphSettings": true,
              "valueText": '',
          },
          "titles":[{
            "text": "Individual "+topic+" events for "+company,
            "size": 15
          },
          {
            "text": "By comparing individual event-windows we can determine how companies can expect to react to certain event types",
            "bold": false
          }],
          "dataProvider": chartData,
          
          "valueAxes": [{
              // "integersOnly": true,
              // "maximum": 6,
              // "minimum": 1,
              "reversed": true,
              "axisAlpha": 0,
              "dashLength": 5,
              "gridCount": 10,
              "position": "left",
              "title": "Cumulative Return (%)"
          }],
          "startDuration": 0,
          "chartCursor": {
              "cursorAlpha": 0,
              "zoomable": false
          },
          "categoryField": "year",
          "categoryAxis": {
              "gridPosition": "start",
              "axisAlpha": 0,
              "fillAlpha": 0.05,
              "fillColor": "#000000",
              "gridAlpha": 0,
              "position": "bottom",
              "title": "Relative event day",
          },
          "export": {
            "enabled": true,
              "position": "bottom-right"
          },

      };

      var graphs = [];
      dates.forEach(function(d){
        graphs.push({
          "balloonText": "[[value]]",
          "bullet": "round",
          "hidden": false,
          "title": d.toDateString(),
          "valueField": d.toDateString(),
          "fillAlphas": 0,
        });  
      });
      chartOptions['graphs'] = graphs;

      // console.log(chartOptions);
      var chart = AmCharts.makeChart("chartdiv", chartOptions);
    }
  }


  function render_candlestick_graph (company_name) {
    var chartData = [];
    Tracker.autorun(function() {
      var stockPrices = StockPrices.find({company_name: company_name, token: token, 'open': {$ne : null}}, {fields: {'date':1, 'open':1, 'last':1, 'high':1, 'low':1, 'volume':1, 'flat_value':1}}).fetch();

      drawGraph(stockPrices,company_name);
    });

    function drawGraph(chartData,company) {


      var chart = AmCharts.makeChart( "chartdiv", {
        "type": "stock",
        "theme": "light",
        "pathToImages": "/amcharts/images/",
        "titles":[{
          "text": "Candlestick graph for "+company,
          "size": 15
        }],
        "dataSets": [{
          "fieldMappings": [ {
            "fromField": "open",
            "toField": "open"
          }, {
            "fromField": "last",
            "toField": "close"
          }, {
            "fromField": "high",
            "toField": "high"
          }, {
            "fromField": "low",
            "toField": "low"
          }, {
            "fromField": "volume",
            "toField": "volume"
          }, {
            "fromField": "flat_value",
            "toField": "value"
          } ],
          "color": "#ff6600",
          "dataProvider": chartData,
          "title": "Candlestick",
          "categoryField": "date"
        }, {
          "fieldMappings": [ {
            "fromField": "flat_value",
            "toField": "value"
          } ],
          "color": "#0077aa",
          "lineColor": "#0077aa",
          "dataProvider": chartData,
          "compared": true,
          "title": "Line",
          "categoryField": "date"
        } ],


        "panels": [ {
          "title": "Stock Price",
          "showCategoryAxis": false,
          "percentHeight": 70,
          "valueAxes": [ {
            "id": "v1",
            "dashLength": 5,
            "title": "Stock Price ($)",
            "unit": "$",
            'unitPosition' : "left",
          } ],

          "categoryAxis": {
            "dashLength": 5,
            "title": "Day"
          },

          "stockGraphs": [ {
            "type": "candlestick",
            "id": "g1",
            "openField": "open",
            "closeField": "close",
            "highField": "high",
            "lowField": "low",
            "valueField": "close",
            "lineColor": "#7f8da9",
            "fillColors": "#7f8da9",
            "negativeLineColor": "#ff6600",
            "negativeFillColors": "#ff6600",
            "fillAlphas": 1,
            "useDataSetColors": false,
            // "comparable": true,
            // "compareField": "value",
            "showBalloon": true,
            "proCandlesticks": true,
            "title": "Candle Stick",
            "balloonText": "Open:<b>[[open]]</b><br>Low:<b>[[low]]</b><br>High:<b>[[high]]</b><br>Close:<b>[[close]]</b><br>Value:<b>[[value]]</b>",
          },
          {
            "type": "line",
            "id": "g2",
            // "openField": "open",
            // "closeField": "close",
            // "highField": "high",
            // "lowField": "low",
            "valueField": "value",
            "lineColor": "#0077aa",
            "fillAlphas": 0,
            "lineThickness": 1.5,
            "dashLength": 4,
            "useDataSetColors": false,
            // "comparable": true,
            // "compareField": "value",
            // "showBalloon": false,
            // "proCandlesticks": true,
            "title": "Average Price",
          }],

          "stockLegend": {
            // "valueTextRegular": undefined,
            // "periodValueTextComparing": "[[value.close]]%"
          }
        },

        {
          "title": "Volume",
          "percentHeight": 30,
          "marginTop": 1,
          "showCategoryAxis": true,
          "valueAxes": [ {
            "dashLength": 5
          } ],

          "categoryAxis": {
            "dashLength": 5
          },

          "stockGraphs": [ {
            "valueField": "volume",
            "type": "column",
            "showBalloon": false,
            "fillAlphas": 1
          } ],

          "stockLegend": {
            "markerType": "none",
            "markerSize": 0,
            "labelText": "",
            "periodValueTextRegular": "[[value.close]]"
          }
        }
        ],

        "chartScrollbar": {
          // "dragIcon": 
        },

        "chartScrollbarSettings": {
          "graph": "g2",
          "graphType": "line",
          "usePeriod": "WW"

        },

        "chartCursorSettings": {
          "valueLineBalloonEnabled": true,
          "valueLineEnabled": true
        },

        "periodSelector": {
          "position": "bottom",
          "periods": [ {
            "period": "DD",
            "count": 10,
            "label": "10 days"
          }, {
            "period": "MM",
            "count": 1,
            "label": "1 month"
          }, {
            "period": "YYYY",
            "count": 1,
            "label": "1 year"
          }, {
            "period": "YTD",
            "label": "YTD"
          }, {
            "period": "MAX",
            "label": "MAX",
            selected: true,
          } ]
        },
        "export": {
          "enabled": true
        }
      });
    }
  }

  function render_company_chart() {
    var c_cr = [];
    var all_company = _.uniq(StockPrices.find({}, {fields:{company_name:1, _id:0}},{sort:{company_name: 1}}).fetch().map(function(x){return x.company_name}),true);
    all_company.forEach(function(c){
      var ret = StockPrices.findOne(
        {
          company_name: c,
          token: token,
        },{
          fields: {
            company_name: 1,
            date: 1,
            cum_return: 1,
          },
          sort:{
            date:-1,
          }
        }
      );
      c_cr.push({
        company_name: c,
        last_cr: ret.cum_return,
      });
    });

    drawGraph(c_cr);

    function handleClick(event) {
      curr_company = event.item.category;
      renderMainGraph();
    }

    function drawGraph(chartData) {
      // console.log('called');

      /**
       * AmCharts plugin: automatically color each individual column
       * -----------------------------------------------------------
       * Will apply to graphs that have autoColor: true set
       */
      AmCharts.addInitHandler(function (chart) {
        // check if there are graphs with autoColor: true set
        for (var i = 0; i < chart.graphs.length; i++) {
          var graph = chart.graphs[i];
          if (graph.autoColor !== true)
            continue;
          var colorKey = "autoColor-" + i;
          graph.lineColorField = colorKey;
          graph.fillColorsField = colorKey;
          for (var x = 0; x < chart.dataProvider.length; x++) {
            //var color = ['#d64608', '#1d7865', '#ff9e1c', '#ff831e', '#ff6400', '#d64608', '#1d7865', '#ff9e1c', '#ff831e', '#ff6400'][x];
            var color = ["#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "#DF5A49", "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "#DF5A49"][x];

            chart.dataProvider[x][colorKey] = color;
          }
        }

      }, ["serial"]);

      var chart = new AmCharts.AmSerialChart();
      chart.dataProvider = chartData;
      chart.categoryField = "company_name";
      //      chart.startDuration = 1;
      chart.startEffect = "elastic ";
      chart.theme = 'light';

      chart.titles = [{
        "text": "Cumulative returns for each stock",
        "bold": true,
        }];

      // add click listener
      chart.addListener("clickGraphItem", handleClick);


      // AXES
      // category
      var categoryAxis = chart.categoryAxis;
      categoryAxis.labelRotation = 90;
      categoryAxis.gridPosition = "start";
      categoryAxis.title = "Companies";
      categoryAxis.titleColor = 'grey';

      // value
      // in case you don't want to change default settings of value axis,
      // you don't need to create it, as one value axis is created automatically.
      var valueAxis = new AmCharts.ValueAxis();
      valueAxis.title = "Cumulative Return (%)";
      valueAxis.titleColor = 'grey';
      chart.addValueAxis(valueAxis);
      
      
      // GRAPH
      var graph = new AmCharts.AmGraph();
      graph.valueField = "last_cr";
      graph.balloonText = "[[category]]: [[value]]";
      graph.type = "column";
      graph.lineAlpha = 0;
      graph.fillAlphas = 0.8;
      chart.rotate = true;
      chart.columnWidth = 1;
      graph.autoColor = true;

      chart.addGraph(graph);

      chart.write("chartdiv3");
    }
  }

  function render_events_chart(company_name, topic, upper_range, lower_range) {
    $('#chart-options').show();
    $('#second-stock-selection').show();


    Tracker.autorun(function() {
      var stocks = StockPrices.find({company_name: company_name, token:token}, {fields: {'date':1, 'cum_return':1}}).fetch();
      var chartData = [];
      var guides = [];

      // events
      var events = StockEvents.find({token: token, company_name: company_name, topic: topic, value: {$gt : 0}}, {fields: {'date':1}}).fetch(); 
      // console.log(events);

      events.forEach(function(c) {
        var dateLower = new Date(c.date);
        dateLower.setDate(dateLower.getDate() + lower_range);
        var dateUpper = new Date(c.date);
        dateUpper.setDate(dateUpper.getDate() + upper_range);

        // console.log(c.date);
        // console.log(dateLower);
        // console.log(dateUpper);
        var significantDays = StockPrices.find({company_name: company_name, token:token, date: {$gte : dateLower, $lte : dateUpper}}, {fields: {'cum_return':1}, sort: {cum_return:1}});
        console.log(significantDays);
        if (significantDays != undefined) {
          var hi = significantDays[Object.keys(significantDays)[Object.keys(significantDays).length - 1]].cum_return;
          var lo = significantDays[Object.keys(significantDays)[0]].cum_return;
          // console.log(hi);
          // console.log(lo);
          //fruitObject[Object.keys(fruitObject)[Object.keys(fruitObject).length - 1]] 
          var p = (hi - lo);
          console.log(p);

          var significance = "Non-significant event";
          if (p > 0.02) {
            significance = "Significant event";
            guides.push({
              "fillAlpha": 0.30,
              "fillColor": "#ff6600",
              "lineColor": "#ff6600",
              "lineAlpha": 0.9,
              "label": topic,
              "balloonText": significance,
              "labelRotation": 90,
              "above": true,
              "date": dateLower,
              "toDate": dateUpper,
            });
          } else {
            guides.push({
              "fillAlpha": 0.30,
              "fillColor": "#ff0000",
              "lineColor": "#ff0000",
              "lineAlpha": 0.9,
              "label": topic,
              "balloonText": significance,
              "labelRotation": 90,
              "above": true,
              "date": dateLower,
              "toDate": dateUpper,
            });
          }
        }
      });

      // every day
      stocks.forEach(function(c) {

        var entry = {
          "date": c.date,
          "cr": parseFloat(c.cum_return),
        };
        chartData.push(entry);
      });
      drawGraph(chartData, guides);
    });

    function drawGraph(chartData, guides) {
      // console.log(guides);
      var titleBig = "Stock Price of " + company_name;
      var titleSmall = topic + " events highlighted";
      var chart = AmCharts.makeChart("chartdiv", {
        "type": "serial",
        "theme": "light",
        "pathToImages": "/amcharts/images/",
        "marginRight": 80,
        "autoMarginOffset": 20,
        "marginTop": 7,
        "dataProvider": chartData,
        "valueAxes": [{
            "axisAlpha": 0.2,
            "dashLength": 1,
            "position": "left"
        }],
        "mouseWheelZoomEnabled": false,
        "graphs": [{
            "id": "g1",
            "balloonText": "CR: [[cr]]",
            "balloonFunction": function(item, graph) {
              var result = graph.balloonText;
              for (var key in item.dataContext) {
                if (item.dataContext.hasOwnProperty(key) && !isNaN(item.dataContext[key])) {
                  var formatted = AmCharts.formatNumber(item.dataContext[key], {
                    precision: 5,
                    decimalSeparator: chart.decimalSeparator,
                    thousandsSeparator: chart.thousandsSeparator
                  }, 2);
                  result = result.replace("[[" + key + "]]", formatted);
                }
              }
              return result;
            },
            "bullet": "round",
            "bulletBorderAlpha": 1,
            "bulletColor": "#FFFFFF",
            "hideBulletsCount": 50,
            "title": "red line",
            "valueField": "cr",
            "useLineColorForBulletBorder": true,

        }],
        "chartScrollbar": {
            "autoGridCount": true,
            "graph": "g1",
            "scrollbarHeight": 40
        },
        "chartCursor": {
           "limitToGraph":"g1"
        },
        "categoryField": "date",
        "categoryAxis": {
            "parseDates": true,
            "axisColor": "#DADADA",
            "dashLength": 1,
            "minorGridEnabled": true
        },
        "export": {
            "enabled": true
        },
        "guides": guides,
        titles: [
          {
            text: titleBig,
            bold: true,
          },
          {
            text: "This Event Study tool allows you to analyse the effect that each event has on the cumulative returns of a company.",
            bold: false,
          },
        ]
      });
    }
  }

  // predefined list of companies
  function render_company_details() {
    $('#chartdiv2').html('');
    var dom = document.getElementById('chartdiv2');

    // is there a better way to code this?
    if (curr_company == 'AAC.AX') {
      Blaze.render(Template.aac, dom);
    } else if (curr_company == 'ELD.AX') {
      Blaze.render(Template.eld, dom);
    } else if (curr_company == 'GNC.AX') {
      Blaze.render(Template.gnc, dom);
    }  else if (curr_company == 'RIC.AX') {
      Blaze.render(Template.ric, dom);
    }  else if (curr_company == 'TGR.AX') {
      Blaze.render(Template.tgr, dom);
    }  else if (curr_company == 'WBA.AX') {
      Blaze.render(Template.wba, dom);
    } 
  }
};

Template.homePage.rendered = function() {
  var debug = false;
  var upload_response = $("#upload_response");
  var cumulative_response = $('#cumulative_response');
  $(".json-response").hide();

  $('#chart_display').hide();


  var gui_input = $('.form-input-name-row');
  gui_input.on('change paste keyup', function () {
    var input = $(this).find('input');
    var input_name = input.attr('name');
    var input_val = input.val();

    console.log(input_name);
    if (input_name == null) {
      input_name = 'var_name';
      var e = $('select#topic-name').val();
      console.log(e);
      input_val = e;
    }
    
    if (input_val != '') {
      if ((input_name == 'token' && input_val != '') ||
        (input_name == 'stock_characteristic_file' && input_val != '') ||
        (input_name == 'stock_price_file' && input_val != '')) {
        $(this).removeClass('form-invalid-data');
        $(this).addClass('form-valid-data');
      } else {
        $(this).removeClass('form-valid-data');
        $(this).addClass('form-invalid-data');
      }
    } else {
      $(this).removeClass('form-valid-data');
      $(this).removeClass('form-invalid-data');
    }
  });
  var base_url = window.location.href;
  var token = $("input[name=token]");
  $("#upload_form").submit(function (event) {
    event.preventDefault();

    upload_response.empty();
    upload_response.show();
    upload_response.html("Processing ...");

    $.ajax({
      url: base_url + "api/v1/event-study/submit-files",
      type: 'POST',
      data: new FormData(this),
      processData: false,
      contentType: false,
      success: function (data) {
        console.log(data.token);
        $(location).attr('href', base_url + "chart/" + data.token);
      },
      error: function (data) {
        upload_response.show();
        upload_response.empty();
        upload_response.html(data.responseJSON.log.exec_status);
        //        upload_response.text(JSON.stringify(data.responseJSON, undefined, 2));
      },
    });
    return false;
  });
  $("#cumulative-return-form").submit(function (event) {
    event.preventDefault();
    $(location).attr('href', base_url + "chart/" + $(token).val());
    return false;
  });
};