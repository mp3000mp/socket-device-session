'use strict';

const noPageTimeout = 5*1000; // 10

const AppSession = function(appId, appUrl, parent) {
  let me = this;

  let status = 'live';
  let pages = [];
  let noPageTimeoutHandler;

  // on attends quelques secondes après fermeture pour gérer changement page
  let startNoPageCountDown = () => {
    status = 'countdown...';
    noPageTimeoutHandler = setTimeout(() => {
      parent.delApp(appId);
    },noPageTimeout)
  }

  // add page
  me.addSocket = function(socket){
    status = 'live';
    clearTimeout(noPageTimeoutHandler);
    let pageUrl = socket.request.headers.referer.replace(appUrl, '');
    pages.push(pageUrl);

    socket.on('disconnect', () => {
      pages.splice(pages.indexOf(pageUrl), 1);
      if(pages.length === 0){
        startNoPageCountDown();
      }
    });
  }

  // debug
  me.debug = function(){
    return {
      appId: appId,
      pages: pages,
      status: status,
      url: appUrl
    };
  }

}

module.exports = AppSession;
