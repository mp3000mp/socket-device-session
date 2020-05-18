'use strict';

const AppSession = require('./app-session');
const DateTime = require('./date-time');

const noAppTimeout = 10*1000;
const noActivityTimeout = 10*1000;
const popupDuration = 10*1000;

const DeviceSession = function(deviceData, parent, mariadb, io) {
  let me = this;

  let status = 'live';
  me.deviceToken = deviceData.deviceToken;
  me.lastPing = Date.now();
  me.apps = {};
  let noAppTimeoutHandler;
  let noActivityTimeouttHandler;
  let popupDurationtHandler;

  // la souris n'a pas bougé depuis x = start timeout no activity timeout countdown
  let startTimeoutCountDown = () => {
    status = 'no activity countdown...';
    popupDurationtHandler = setTimeout(() => {
      io.to(me.deviceToken).emit('logout');
      parent.destroySession(me.deviceToken, 2);
    },popupDuration)
  }

  // la souris n'a pas bougé depuis x = show popup and start timeout countdown
  let startInactivityCountDown = () => {
    status = 'live';
    clearTimeout(noActivityTimeouttHandler);
    clearTimeout(popupDurationtHandler);
    noActivityTimeouttHandler = setTimeout(() => {
      io.to(me.deviceToken).emit('preLogout', (popupDuration/1000));
      startTimeoutCountDown();
    },noActivityTimeout)
  }

  // plus d'onglet ouverts = start no app timeout countdown
  let startNoAppCountDown = () => {
    status = 'no app countdown...';
    noAppTimeoutHandler = setTimeout(() => {
      parent.destroySession(me.deviceToken, 2);
    },noAppTimeout)
  }

  // add app
  me.addSocket = function(socket, appId){
    // add to device room
    socket.join(me.deviceToken);
    socket.join(deviceData.userId);

    // get app
    if(typeof me.apps[appId] === 'undefined'){
      me.apps[appId] = new AppSession(appId, socket.request.headers.origin, me);
    }
    me.apps[appId].addSocket(socket, appId);

    // mouse activity
    startInactivityCountDown();
    socket.on('alive', () => {
      me.lastPing = Date.now();
      startInactivityCountDown();
    });

    // logout
    socket.on('logout', () => {
      io.to(me.deviceToken).emit('logout');
      parent.destroySession(me.deviceToken, 1);
    });

    socket.on('account', () => {
      socket.emit('account', parent.debug());
    })
  }

  // kill app
  me.delApp = function(appId){
    if(appId !== deviceData.portalId){
      mariadb.query('UPDATE connection_audit_trail SET reason = ?, ended_at = NOW() WHERE ended_at IS NULL AND device_session_token = ? AND application_id = ?', [2, deviceData.deviceToken, appId])
        .then(() => {

        })
        .catch(err => {
          console.log(err);
        })
    }
    delete me.apps[appId];
    if(Object.keys(me.apps).length === 0){
      startNoAppCountDown();
    }
  }

  // json
  me.debug = function(){
    let debug = {
      apps: {},
      deviceToken: deviceData.deviceToken,
      lastPing: DateTime.fromDateToStr(new Date(me.lastPing)),
      portalId: deviceData.portalId,
      startedAt: DateTime.fromDateToStr(new Date(deviceData.startedAt*1000)),
      status: status,
      userAgent: deviceData.userAgent,
      userId: deviceData.userId
    };
    for(let appId in me.apps){
      debug.apps[appId] = JSON.stringify(me.apps[appId].debug());
    }
    return debug;
  }

};

module.exports = DeviceSession;
