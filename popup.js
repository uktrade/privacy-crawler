var currentTab = "Queued";
var bgPage = chrome.extension.getBackgroundPage();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message == 'refresh_page') refreshPage();
});

function delegate(element, event, selector, handler) {
    element.addEventListener(event, function(e) {
        for (var target = e.target; target; target = target.parentNode) {
            if (target.matches(selector)) {
                handler(e);
                break;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    delegate(document.body, 'click', '#crawlButton', () => {
        bgPage.appState == "paused"  ? bgPage.crawlMore() :
        bgPage.appState == "stopped" ? bgPage.beginCrawl($("#crawUrl").val(), parseInt($("#maxDepth").val())) :
                                       bgPage.pause();
        refreshPage();
    });
    delegate(document.body, 'click', '#resetButton', bgPage.reset);

    delegate(document.body, 'click', '.open-tab-button', (e) => {
        e.preventDefault();
        currentTab = $(e.target).data('tab');
        refreshPage();
    });

    delegate(document.body, 'click', '.link', (e) => {
       e.preventDefault();
       chrome.tabs.create({url: e.target.href, selected:false});
    });

    delegate(document.body, 'click', '.cookies-copy-to-clipboard', () => {
        copyToClipboard($('#cookies-csv').text())
        $(e.target).after('<span>Copied to clipboard</span>');
    });

    onLoad();
}, false);

async function onLoad() {   
    var url = settings.root ? settings.root : (await tabQuery({active: true, currentWindow: true}))[0].url;
    $("#crawUrl").val(url);
    $("#maxDepth").val(settings.maxDepth);
    refreshPage();
}

function refreshPage() {
    var crawlButtonText = bgPage.appState == "paused"  ? "Resume" :
                          bgPage.appState == "stopped" ? "Crawl"  :
                                                         "Pause";
    $("#crawlButton").val(crawlButtonText);
    var isDisabledCrawl = bgPage.appState == "paused" && bgPage.getURLsInTab("Crawling").length > 0;
    $("#crawlButton").attr("disabled", isDisabledCrawl);
    
    var isDisabled = bgPage.getURLsInTab("Crawling").length > 0;
    $("#maxDepth").attr("disabled", isDisabled);
    $("#crawUrl").attr("disabled", isDisabled);
    $("#resetButton").attr("disabled", isDisabled);
            
    $("#tabs").html(
        bgPage.tabs.map(function(tab) {
            var count = tab == 'Cookies' ? bgPage.allCookies.length : bgPage.getURLsInTab(tab).length;
            var innerTxt = tab + " ("+ count +")";
            var liTxt = tab == currentTab ? innerTxt : "<a href='#' class=\"open-tab-button\" data-tab=\""+ tab +"\">" + innerTxt + "</a>";
            return "<li>" + liTxt + "</li>";
        }).join('')
    );
    
    $("#urlsBeingSearched").html(
        bgPage.getURLsInTab(currentTab).map((page) => {
            return "<li><a href=\"" + page.url + "\" class=\"link\">" + page.url + "</a></li>";
        }).join('')
    );

    $('#allCookies').html(
        currentTab == 'Cookies' ?
            (() => {
                var keys = bgPage.allCookies.reduce((uniqueKeys, cookie) => {
                    var newKeys = Object.keys(cookie).filter((key) => {
                        return uniqueKeys.indexOf(key) === -1;
                    });
                    return uniqueKeys.concat(newKeys);
                }, []);

                var keysData = keys.join('\t') + '\n';

                var cookiesData = bgPage.allCookies.map((cookie) => {
                    return keys.map((key) => {
                        return (key in cookie) ? cookie[key] : '';
                    }).join('\t') + '\n';
                }).join('');
                return '<div><button class="cookies-copy-to-clipboard">Copy table to clipboard</button></div>' +
                       '<div id="cookies-csv">' + keysData + cookiesData + '</div>';
            })()
        : ''
    );
}
