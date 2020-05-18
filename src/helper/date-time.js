'use strict';

const dateTime = {
  fromDateToStr: (d) => {
    let m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    let s = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
    return d.getHours()+':'+m+':'+s;
  }
}

module.exports = dateTime;
