function timeout(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

var loaded = new Promise((resolve, reject) => {
    window.addEventListener('load', () => {
        resolve();
    });
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.text === 'get_analysis') {
        loaded.then(() => {
            return timeout(6000);
        }).then(() => {
            var links = Array.from(document.body.getElementsByTagName("a")).map(function(a) {
                return a.href;
            });
            sendResponse({links: links, symbols_accessed: symbols_accessed});
        });
        return true;
    }
});

var event_id = Math.random();

var scriptElement = document.createElement('script');
scriptElement.src = chrome.extension.getURL('instrument.js');
scriptElement.setAttribute('data-event-id', event_id);
scriptElement.onload = () => {
    scriptElement.remove();
};

var parent = document.documentElement;
parent.insertBefore(scriptElement, parent.firstChild);

var symbols_accessed = [];
document.addEventListener(event_id, (e) => {
    e.detail.forEach((d) => {
        var name = d.content.symbol;
        if (symbols_accessed.indexOf(name) === -1) {
            symbols_accessed.push(name);
        }
    });
});
