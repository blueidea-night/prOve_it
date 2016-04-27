ES = {
  
  get_cum_return_by_date: function (stock_price_file, c_name, date) {
    if (stock_price_file == null) {
      return stock_price_file;
    }
    var fields = stock_price_file[0];
    var RIC_id = fields.indexOf('#RIC');
    var date_id = fields.indexOf('Date[L]');
    var open_id = fields.indexOf('Open');
    var last_id = fields.indexOf('Last');
    var return_percent_id = fields.length;
    var cum_return_id = fields.length + 1;
    for (var i = 1; i < stock_price_file.length; i++) {
      if (stock_price_file[i][RIC_id].toString() == c_name && stock_price_file[i][date_id].toString() == date) {
        return stock_price_file[i];
      }
    }
    return null;
  },

  // get all the line that have the type of event with in the upper range and lower range
  get_events: function (stock_characteristic_file, topic_name, upper_range, lower_range) {
    //  
    //  console.log("topic_name: "+topic_name);
    //  console.log("upper_range: "+upper_range);
    //  console.log("lower_range: "+lower_range);
    //  
    var fields = stock_characteristic_file[0];
    var topic_id = fields.indexOf(topic_name);
    var rel_events = [];

    //  console.log("topic id: "+topic_id);

    if (topic_id == -1) return [];

    for (var i = 0; i < stock_characteristic_file.length; i++) {
      var curr_val = stock_characteristic_file[i][topic_id];
      //    console.log(curr_val);
      if (curr_val <= upper_range && curr_val >= lower_range) {
        rel_events.push(stock_characteristic_file[i]);
      }
    }
    return rel_events;
  },

  // return the correct date format of the event line
  get_event_date: function (event) {

    // needs to be in format: dd-mmm-yyyy
    var uncheckedDate = event[1].toString();
    var checkedDayDate = uncheckedDate;
    var checkedDate = uncheckedDate;
    if (!uncheckedDate.match(/^[0-9]{2}-[a-zA-Z]{3}-[0-9]{4}$/)) {
      // doesn't match format, probably missing digit(s) from day or year
      if (uncheckedDate.match(/^[0-9]{1}-[a-zA-Z]{3}/)) {
        // weird day
        checkedDayDate = "0" + uncheckedDate;
      }
      if (checkedDayDate.match(/^[0-9]{2}-[a-zA-Z]{3}-[0-9]{2}$/)) {
        // weird year, assume all years are 2000 or after
        checkedDate = checkedDayDate.replace(/([0-9]{2}-[a-zA-Z]{3}-)([0-9]{2})/, "$120$2");
      }
    }
    // HELP!! why does it not work if it's '02-Mar-2016'?
    //    if (checkedDate === '02-Mar-2016') {
    //      console.log("found");
    //      checkedDate = '02-Mar-16';
    //    }
    //    console.log(checkedDate);
    return checkedDate;
  },

  // return the company name of the event line
  get_event_company: function (event) {
    return event[0].toString();
  },

  // return the cumulative returns with upper window and lower window 
  get_cum_return: function (stock_price_file, event, upper_window, lower_window) {
    lower_window = Math.abs(lower_window);
    upper_window = Math.abs(upper_window);

    var company_name = ES.get_event_company(event);
    var date = ES.get_event_date(event).toUpperCase();
    
    var fields = stock_price_file[0];
    var RIC_id = fields.indexOf('#RIC');
    var date_id = fields.indexOf('Date[L]');
    var cum_return_id = fields.length + 1;

    var cum_return = [];

    for (var i = 1; i < stock_price_file.length; i++) {
      var curr_company_name = stock_price_file[i][RIC_id].toString();
      var curr_date = stock_price_file[i][date_id].toString().toUpperCase();

      if (curr_company_name == company_name && curr_date == date) {
        for (var j = 1; j <= lower_window; j++) {

          if (i - j < 1) {
            var ret = {};
            ret[-j] = null;
            cum_return.unshift(ret);
          } else {
            var c = stock_price_file[i - j][RIC_id].toString();
            if (c == company_name) {
              var ret = {};
              ret[-j] = parseFloat(stock_price_file[i - j][cum_return_id].toString());
              cum_return.unshift(ret);
            } else {
              var ret = {};
              ret[-j] = null;
              cum_return.unshift(ret);
            }
          }
        }
        var ret = {};
        ret[0] = parseFloat(stock_price_file[i][cum_return_id].toString());
        cum_return.push(ret);
        for (var j = 1; j <= upper_window; j++) {
          if (i + j >= stock_price_file.length) {
            var ret = {};
            ret[j] = null;
            cum_return.push(ret);
          } else {
            var c = stock_price_file[i + j][RIC_id].toString();
            if (c == company_name) {
              var ret = {};
              ret[j] = parseFloat(stock_price_file[i + j][cum_return_id].toString());
              cum_return.push(ret);
            } else {
              var ret = {};
              ret[j] = null;
              cum_return.push(ret);
            }
          }
        }
        break;
      }
    }
    return {
      company_name: company_name,
      event_date: date,
      cumulative_returns: cum_return,
    }
  },


  // return all campany names in files
  get_all_query_company: function (file) {
    if (file == null) {
      return file;
    }

    var fields = file[0];
    var RIC_id = fields.indexOf('#RIC');

    var all_company = [];

    for (var i = 1; i < file.length; i++) {
      var c = file[i][RIC_id].toString();
      if (all_company.indexOf(c) == -1) {
        all_company.push(c);
      }
    }
    return all_company;
  },


  // calculate the cumulative return for each day in the stock price file
  calc_cumulative_returns: function (stock_price_file) {
    if (stock_price_file == null) {
      return stock_price_file;
    }
    var fields = stock_price_file[0];
    var RIC_id = fields.indexOf('#RIC');
    var date_id = fields.indexOf('Date[L]');
    var open_id = fields.indexOf('Open');
    var last_id = fields.indexOf('Last');
    var return_percent_id = fields.length;
    var cum_return_id = fields.length + 1;

    var prev_company = "";
    var prev_last = 0;

    // for debug
    //  var nLine = 0;


    for (var i = 1; i < stock_price_file.length; i++) {
      //    var isC = false;
      //    if (stock_price_file[i][RIC_id].toString() == "ELD.AX"){
      //      isC = true;
      //    }
      //
      //    if (nLine == 10) {
      //      break;
      //    }
      //    if (isC) {
      //      nLine++;
      //    }

      //    console.log("newline");
      var current_last = stock_price_file[i][last_id];
      if (current_last == '') {
        //      console.log("no last");
        if (prev_company != stock_price_file[i][RIC_id].toString()) {
          prev_last = 0;
          //        console.log("different company");
          var same_c = stock_price_file[i][RIC_id].toString();
          var open = stock_price_file[i][open_id];
          for (var j = i; j < stock_price_file.length; j++) {
            //          console.log("checking" + stock_price_file[j].toString());
            if (stock_price_file[j][RIC_id].toString() == same_c && stock_price_file[j][open_id] != '') {
              open = stock_price_file[j][open_id];
              //            console.log("found a better open: " + open);
              break;
            }
          }
          //        current_company = same_c;
          current_last = open;
        } else {
          current_last = prev_last;
        }
      } else if (prev_company != stock_price_file[i][RIC_id].toString()) {
        prev_last = 0;
      }

      //    if (isC) {
      //      console.log("prev_last" + prev_last);
      //      console.log("current_last" + current_last);
      //    }
      // calculate the cumulative return percentage and cum return here
      if (prev_last == 0) {
        stock_price_file[i][return_percent_id] = 0;
      } else {
        stock_price_file[i][return_percent_id] = (current_last - prev_last) / prev_last;
      }


      var cum_return = 0;
      var prev_c = stock_price_file[i - 1][RIC_id].toString();
      //    if (isC) {
      //
      //      console.log("prev_c: " + prev_c);
      //      console.log("curr_c: " + stock_price_file[i][RIC_id].toString());
      //    }
      if (stock_price_file[i][RIC_id].toString() != prev_c) {
        cum_return = stock_price_file[i][return_percent_id];
        //      if (isC) {
        //        console.log("different company");
        //      }
      } else {
        //      if (isC) {
        //        console.log("same company");
        //      }
        cum_return = stock_price_file[i][return_percent_id] + stock_price_file[i - 1][cum_return_id];

      }
      stock_price_file[i][cum_return_id] = cum_return;
      //    if (isC) {
      //      console.log("cum%: " + stock_price_file[i][return_percent_id]);
      //      console.log("cum return: " + stock_price_file[i][cum_return_id]);
      //    }
      prev_last = current_last;
      prev_company = stock_price_file[i][RIC_id].toString();
    }

    return stock_price_file;
  },


  // return a JSON of each individual in the stock characteristic file
  get_all_events: function(stock_characteristic_file) {
    var title_line = stock_characteristic_file[0];
    var line_length = title_line.length;
    var results = [];
    for (var i=1; i < stock_characteristic_file.length; i++) {

      var current_line = stock_characteristic_file[i];
      // console.log(current_line);
      for (var j=2; j<line_length; j++) {
        if (current_line[j] > 0) {
          var company_name = current_line[0].toString();
          var date = current_line[1].toString();
          var event_type = title_line[j].toString();
          var value = current_line[j];
          results.push({
            company_name: company_name,
            date: date,
            event_type: event_type,
            value: value,
          });
        }
      }
    }
    return results;
  },

  // calculate the average cumulative return for each event
  calc_avg_cr_for_event: function (stock_price_file, company_name, date, upper_window, lower_window) {
    lower_window = Math.abs(lower_window);
    upper_window = Math.abs(upper_window);

    date = date.toUpperCase();
    
    var fields = stock_price_file[0];
    var RIC_id = fields.indexOf('#RIC');
    var date_id = fields.indexOf('Date[L]');
    var cum_return_id = fields.length + 1;

    var total_cr = 0;
    var num_cr = upper_window + lower_window + 1;

    for (var i = 1; i < stock_price_file.length; i++) {
      var curr_company_name = stock_price_file[i][RIC_id].toString();
      var curr_date = stock_price_file[i][date_id].toString().toUpperCase();

      if (curr_company_name == company_name && curr_date == date) {
        for (var j = 1; j <= lower_window; j++) {
          if (i - j >= 1) {
            var c = stock_price_file[i - j][RIC_id].toString();
            if (c == company_name) {
              total_cr += parseFloat(stock_price_file[i - j][cum_return_id].toString());
            }
          }
        }
        total_cr += parseFloat(stock_price_file[i][cum_return_id].toString());
        for (var j = 1; j <= upper_window; j++) {
          if (i + j < stock_price_file.length) {
            var c = stock_price_file[i + j][RIC_id].toString();
            if (c == company_name) {
              total_cr += parseFloat(stock_price_file[i + j][cum_return_id].toString());
            }
          }
        }
        break;
      }
    }
    return total_cr/num_cr;
  },

  // store the average cumulative return for each event to the Events Database
  avg_cr_for_events: function (stock_price_file,all_events,file_token) {
    var upper_window = 5;
    var lower_window = -5;

    for (var i = 0; i < all_events.length; i++) {
      var company_name = all_events[i]['company_name'];
      var event_date   = all_events[i]['date'];
      var topic = all_events[i]['event_type'];
      var topic_val = all_events[i]['value'];
      var avg_cr = ES.calc_avg_cr_for_event(stock_price_file, company_name, event_date, upper_window, lower_window);

      Events.insert({
        company_name : company_name,
        event_date   : event_date,
        avg_cr       : avg_cr,
        topic        : topic,
        topic_val    : topic_val,
        file_token   : file_token,
      });
    }
  },

  company_and_avg_cr_for_topic: function (all_company, token) {
    for (var c in all_company) {
      var company_name = all_company[c];
      var all_events = Events.find({company_name: company_name, file_token: token}).fetch();
      // var distinct_topics = Events.distinct('topic').find({company_name: company_name, file_token: token});
      var distinct_topics = getDistinctTopic(company_name,token);
      // console.log("distinct");
      // console.log(distinct_topics);
      for (var t in distinct_topics) {
        var all_topic_events = Events.find({company_name: company_name, topic: distinct_topics[t],file_token:token}).fetch();
        var sum_cr = 0;
        for (var e in all_topic_events) {
          // console.log(all_topic_events[e]);
          sum_cr += all_topic_events[e]['avg_cr'];
        }
        var avg_avg_cr = sum_cr/(all_topic_events).length;
        // console.log(avg_avg_cr);
        Topics.insert({
          company_name : company_name,
          topic        : distinct_topics[t],
          avg_cr_topic : avg_avg_cr,
          file_token   : token,
        });
      }
    }

  },

  company_avg_cr: function (all_company, token) {
    for (var c in all_company) {
      var company_name = all_company[c];
      var topics = Topics.find({company_name: company_name, file_token: token}).fetch();
      var sum_avg_cr = 0;
      for (var t in topics) {
        sum_avg_cr += topics[t]['avg_cr_topic'];
      }
      var avg_avg_topic_cr = sum_avg_cr / (topics.length);
      Companys.insert({
        company_name : company_name,
        avg_cr       : avg_avg_topic_cr,
        file_token   : token,
      });
    }
  }

};

function getDistinctTopic(company_name,token) {
  // console.log(company_name+" "+token);
  var data = Events.find({company_name: company_name, file_token: token}).fetch();
  var distinctData = _.uniq(data, false, function(d) {return d.topic});
  return _.pluck(distinctData, "topic");
}