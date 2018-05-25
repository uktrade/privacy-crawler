var currentTab = "Queued";
var refreshNeeded = true;
var refreshTimerInterval = 2000;
var refreshTimer = setTimeout(refreshPage,refreshTimerInterval);
var bgPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function() {
    $('#crawlButton').bind('click', onCrawlClicked);
    $('#resetButton').bind('click', onResetClicked);
    onLoad();
}, false);


function onLoad() 
{   
    var u = bgPage.crawlStartURL;
    if(!u || u=="") { chrome.tabs.getSelected(null,function(tab) { $("#crawUrl").val(tab.url); }); }
    else { $("#crawUrl").val(u); }
    refreshPage();
}   

$(window).unload(function() 
{
    if(bgPage.settings.pauseOnPopClose==1)
    {
        if(bgPage.appState=="crawling")
        {
            console.log("Popup Closing Pausing Crawl");
            stopCrawl();    
        }
    }
});

//function refreshPage(force) { refreshNeeded = true; if(force){onRefreshTick();} } 
//function refreshPage(force) { onRefreshTick(); }  

function refreshPage() 
{
    // Start the timer again
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshPage,refreshTimerInterval);
        
    // First clear everything out
    $("#tabs li").remove();
    $("#urlsBeingSearched li").remove();
            
    // Build each tab
    $(bgPage.tabs).each(function(i, tab)
    {
        var innerTxt = this+" ("+bgPage.getURLsInTab(this).length+")";
        var liTxt = this==currentTab?innerTxt:"<a href='#' id=\"openTabButton-"+ i +"\" >"+innerTxt+"</a>";
        $("#tabs").append("<li>"+liTxt+"</li>");
        $("#openTabButton-"+i).bind('click', function() {
            openTab(tab);
            return false;
        });
    });
    
    // Set button text
    if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length>0) {  $("#crawlButton").val("Resume"); }
    else if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length==0) { $("#crawlButton").val("Crawl"); }
    else if(bgPage.appState=="crawling") { $("#crawlButton").val("Pause");  }
    
    // Set enabledness
    if(bgPage.appState=="crawling"){ $("#crawUrl").attr("disabled", true); $("#resetButton").attr("disabled", true); }
    else { $("#crawUrl").attr("disabled", false); $("#resetButton").attr("disabled", false);}
        
    if(currentTab=="X")
    {
        //$("#infovis").empty();
        //renderGraph();
    }
    else
    {       
        // List all the urls on this tab
        $(bgPage.getURLsInTab(currentTab)).each(function(i, tab)
        {
            $("#urlsBeingSearched").append("<li><a href='#' id=\"tab-"+ i + "\">"+this.url+"</a></li>");
            $("#tab-" + i).bind(function() {
                onLIURLClicked(tab.url);
                return false;
            })
        });
        
        
        $("#urlsBeingSearched li:even").css("background-color", "#f8f8f8");
    
    }
    
    // If we are done then stop the crawl now
    if(bgPage.appState=="crawling" && bgPage.getURLsInTab("Crawling").length==0 && bgPage.getURLsInTab("Queued").length==0){ stopCrawl(); }
}



function onLIURLClicked(url)
{
    //document.execCommand('SaveAs',null,filename)
    chrome.tabs.create({url:url, selected:false});
}

function openTab(tab) 
{
     currentTab = tab;
     refreshPage();
}

function onCrawlClicked()
{
    if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length>0)
    {
        console.log("Resuming Crawl");  
        bgPage.appState="crawling";
        bgPage.crawlMore();
    }
    else if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length==0)
    {
        console.log("Beginning Crawl");
        bgPage.beginCrawl($("#crawUrl").val());
    }
    else if(bgPage.appState=="crawling")
    {
        console.log("Pausing Crawl");
        stopCrawl();        
    }
    refreshPage();
}

function onResetClicked()
{
    stopCrawl();
    bgPage.reset();
    chrome.tabs.getSelected(null,function(tab) { $("#crawUrl").val(tab.url); })
    refreshPage();
}

function stopCrawl()
{
    bgPage.appState = "stopped";
    $("#crawUrl").attr("disabled", false);
    $("#crawlButton").val(bgPage.getURLsInTab("Queued").length==0?"Crawl":"Resume");    
    
    for(var ref in bgPage.allPages) 
    {
        var o = bgPage.allPages[ref]
        if(o.state=="crawling")
        {           
            o.request.abort(); 
            delete o.request; 
            console.log("AJAX page load aborted -> "+JSON.stringify(o));
            o.state = "queued";
        }
    }
    
    refreshPage();
}
