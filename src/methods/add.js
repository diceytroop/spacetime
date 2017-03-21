'use strict';
const walkTo = require('./set/walk');
const ms = require('../data/milliseconds');
const monthLength = require('../data/monthLength');


const normalize = (str) => {
  str = str.toLowerCase();
  str = str.replace(/s$/, '');
  if (str === 'day') {
    return 'date';
  }
  return str;
};

let keep = {
  second: ['millisecond'],
  minute: ['millisecond', 'second'],
  hour: ['millisecond', 'second', 'minute'],
  date: ['millisecond', 'second', 'minute', 'hour'],
  month: ['millisecond', 'second', 'minute', 'hour'],
  year: ['millisecond', 'second', 'minute', 'hour', 'date', 'month'],
};
keep.week = keep.date;
keep.season = keep.date;
keep.quarter = keep.date;

//month is the only thing we 'model/compute'
//- because ms-shifting can be off by enough
const rollMonth = function(want, old) {
  //increment year
  if (want.month > 0) {
    let years = parseInt(want.month / 12, 10);
    want.year = old.year() + years;
    want.month = want.month % 12;
  } else if (want.month < 0) { //decrement year
    let years = Math.floor(Math.abs(want.month) / 13, 10);
    years = Math.abs(years) + 1;
    want.year = old.year() - years;
    //ignore extras
    want.month = want.month % 12;
    want.month = want.month + 12;
    if (want.month === 12) {
      want.month = 0;
    }
    // want.month = Math.abs(want.month);
    // want.month = (want.month % 12) + 12;
    console.log('back ' + years + ' years - set month to ' + want.month);
  }
  //keep date, unless the month doesn't have it.
  let max = monthLength[old.month()];
  want.date = old.date();
  if (want.date > max) {
    want.date = max;
  }
  return want;
};

const addMethods = (Space) => {

  const methods = {

    add: function(num, unit) {
      let old = this.clone();
      unit = normalize(unit);
      //move forward by the estimated milliseconds (rough)
      if (ms[unit]) {
        this.epoch += ms[unit] * num;
      } else if (unit === 'week') {
        this.epoch += ms.day * (num * 7);
      } else if (unit === 'quarter' || unit === 'season') {
        this.epoch += ms.month * (num * 4);
      } else if (unit === 'season') {
        this.epoch += ms.month * (num * 4);
      }
      //now ensure our milliseconds/etc are in-line
      let want = {};
      if (keep[unit]) {
        keep[unit].forEach((u) => {
          want[u] = old[u]();
        });
      }
      //ensure month/year has ticked-over
      if (unit === 'month') {
        want.month = old.month() + num;
        //month is the one unit we 'model' directly
        want = rollMonth(want, old);
      }
      walkTo(this, want);
      return this;
    },

    subtract: function(num, unit) {
      this.add(num * -1, unit);
      return this;
    },
  };

  //hook them into proto
  Object.keys(methods).forEach((k) => {
    Space.prototype[k] = methods[k];
  });
  return Space;
};

module.exports = addMethods;
