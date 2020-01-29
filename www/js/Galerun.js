// Galerun Mobile app v.1.0
// by faust93 at monumentum@gmail.com
var pagesHistory = [];
var path = "";

var gURL;
var cPath = "/";

var dlPath = "Pictures"; //default download path on (ext)storage
var scaleFactor = "1.8"; //image downscale factor
var sortOrder = "dsc";  //asc & dsc for ascending and descending respectively

const THUMB_BIG = 2.13;
const THUMB_MEDIUM = 4.4;
const THUMB_SMALL = 6.8;

var thumbSize;
var thumbScale = THUMB_MEDIUM; //def thumb size
var thumbsToLoad = 40; //def number of thumbs to load

var prefs;
var screenWidth;
var loggedin = false;

var selectBuffer = [];

// img viewer & options
var viewer;
var options = {
     url: 'data-original',
     inline: false,
     navbar: false,
     button: false,
     toolbar: false,
     movable: true,
     transition: false,
     viewed(img){
        viewer.zoom("0.1");
     },
     filter(img){
         if(img.className.includes("folder")){
            return false;
        } else {
            return true;
        }
    }
};

window.fn = {};

// bootstrap & hooks
function onCreate() {
    prefs = plugins.appPreferences;
    screenWidth = window.screen.width;
    thumbSize = Math.ceil(screenWidth / thumbScale);

    prefs.fetch((ret) => { dlPath = ret; }, (err) => { console.log("unable to fetch preference: " + err); }, "dlpath");
    prefs.fetch((ret) => { scaleFactor = ret; }, (err) => { console.log("unable to fetch preference: " + err); }, "scale");
    prefs.fetch((ret) => { if(ret){ sortOrder = ret; }}, (err) => { console.log("unable to fetch preference: " + err); }, "sort");
    prefs.fetch((ret) => {
        if(ret){
            document.querySelector('#theme').setAttribute('href', 'css/dark-onsen-css-components.min.css');
        }}, (err) => { console.log("unable to fetch preference: " + err); }, "theme");

    //some preps before opening actual images page
    document.addEventListener('init', function(event) {
        var page = event.target;
        if (page.matches('#images-page')) {
            var sIcon = $("#gsortOrder")[0];
            if(sortOrder == "dsc"){
                sIcon.setAttribute('icon', 'md-sort-amount-desc');
            } else {
                sIcon.setAttribute('icon', 'md-sort-amount-asc');
            }
            page.onInfiniteScroll = function(done) {
                loadImages(thumbsToLoad);
                done();
            }
        }
    });

    ons.ready(() => {
    document.querySelector('ons-splitter-side').addEventListener('preopen', function() { fn.initSplitter(); }) //populate splitter on open

    //back button handler
    ons.enableDeviceBackButtonHandler();
    ons.setDefaultDeviceBackButtonListener(function(event) {
        if ($('.viewer-open').length) {
            viewer.hide();
        } else if ($('#images-page').length) {
            fn.imgPBack();
        } else {
          ons.notification.confirm('Do you want to close the app?') // Ask for confirmation
          .then(function(index) {
                if (index === 1) { // OK button
                    navigator.app.exitApp(); // Close the app
                  }
                  });
          }
         });
    });

    //orientation change handler
    window.addEventListener('orientationchange', function(){
        screenWidth = window.screen.width;
        thumbSize = Math.ceil(screenWidth / thumbScale);
        if(cPath != ""){
            fn.listImages(cPath);
        }
    });

}

// onresume handler
function onResume() {
        prefs.fetch((ret) => { dlPath = ret; }, (err) => { console.log("unable to fetch preference: " + err); }, "dlpath");
        prefs.fetch((ret) => {
            if(ret != scaleFactor && loggedin){
                scaleFactor = ret;
                fn.listImages(cPath);
                }
         }, (err) => { console.log("unable to fetch preference: " + err); }, "scale");
        prefs.fetch((ret) => {
            if(ret){
                document.querySelector('#theme').setAttribute('href', 'css/dark-onsen-css-components.min.css');
            } else {
                document.querySelector('#theme').setAttribute('href', 'css/onsen-css-components.min.css');
            }}, (err) => { console.log("unable to fetch preference: " + err); }, "theme");
}

//app settings screen
window.fn.appSettings = function() {
    prefs.show((ok) => {},(fail) => { console.log("FAIL");});
}

//back button handler for images browser
window.fn.imgPBack = function() {
    var len = pagesHistory.length;
    if(len == 1) {
        ons.notification.confirm('Do you want to close the app?') // Ask for confirmation
        .then(function(index) {
        if (index === 1) { // OK button
            navigator.app.exitApp(); // Close the app
          }});
    } else {
        fn.listImages(pagesHistory[len-2]);
    }
}

// populate splitter menu
window.fn.initSplitter = function() {
    var servers = [];
    var spl = $('#gsplitter');
    var html = '';

    prefs.fetch((ret) => {
        if(ret != null){
                servers = ret;
            }
            for(var i = 0, len = servers.length; i < len; i++) {
                html += `<ons-list-item modifier="nodivider" tappable><div onclick="menu.close();fn.login('${servers[i]}')">${servers[i]}</div><div class="right" onclick="menu.close();fn.editServer('${servers[i]}')"><ons-icon class="list-item__icon" icon="ion-ios-information"></ons-icon></div></ons-list-item>`;
            }
            spl.empty();
            spl.append(html);
        }, (err) => { console.log(err); }, 
        'servers');
}


// show images viewer
window.fn.imageClicked = function(event) {
    if(viewer){
        viewer.destroy();
    }
    viewer = new Viewer(document.getElementById('g-images'), options);
    viewer.show();
}

// sort button handler
window.fn.sortButton = function() {
    var sIcon = $("#gsortOrder")[0];
    if(sortOrder == "dsc"){
        sortOrder = "asc";
        sIcon.setAttribute('icon', 'md-sort-amount-asc');
    } else if(sortOrder == "asc"){
        sortOrder = "dsc";
        sIcon.setAttribute('icon', 'md-sort-amount-desc');
    }
    prefs.store(() => {}, () => { console.log("fail"); }, 'sort', sortOrder);
    fn.listImages(cPath);
}

// image long tap handler
window.fn.imageLongTap = function(event) {
    console.log(event.target.getAttribute('data-original'));
    var m = $('#gImgDialog')[0];
    m.setAttribute('data-file', event.target.getAttribute('data-original'));
    m.addEventListener('prehide', (event) => {
        $("img[data-original='" + event.target.dataset.file + "']")[0].style.filter="brightness(100%)";
        });
    event.target.style.filter="brightness(40%)";
    gImgDialog.show();
}

// directory long tap handler
window.fn.dirLongTap = function(event) {
    console.log(event.target.getAttribute('src'));
    var m = $('#gDirDialog')[0];
    m.setAttribute('data-file', event.target.getAttribute('src'));
    m.addEventListener('posthide', (event) => {
        $("img[src='" + event.target.dataset.file + "']")[0].style.filter="brightness(100%)";
        });
    event.target.style.filter="brightness(40%)";
    gDirDialog.show();
}

// search
window.fn.search = function() {
    ons.notification.prompt({ message: 'Specify search string', cancelable: 'true', title: 'Regex search' })
    .then(function(filter) {
        if(filter){
            fn.listImages(cPath,filter);
        }
      });
}

window.fn.createDir = function() {
    ons.notification.prompt({ message: 'Specify folder name', cancelable: 'true', title: 'Create folder' })
    .then(function(name) {
        if(name){
            if(cPath!="/"){
                name = cPath + "/" + name;
            }
            $.ajax({
                type: "get",
                cache: false,
                xhrFields: { withCredentials: true },
                crossDomain: true,
                url: gURL+"/api/cmd?c=dir_create&p="+name,
                success: function(data,stat,req){
                    fn.listImages(cPath);
                },
                error: function(error){
                    gImgDialog.hide();
                    ons.notification.alert(error.responseJSON.data.error.error_message);
                }
            });
        }
      });
}

// delete image
window.fn.deleteImg = function() {
    var path_file = $('#gImgDialog')[0].getAttribute('data-file');
    var file = path_file.match(/f=(.*)/)[1];
    var img = $("img[data-original='" + path_file + "']").parent().parent();
    $.ajax({
        type: "get",
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        url: gURL+"/api/del?f="+file,
        success: function(data,stat,req){
            img[0].remove();
            gImgDialog.hide();
        },
        error: function(error){
            gImgDialog.hide();
            ons.notification.alert(error.responseJSON.data.error.error_message);
        }
        });
}

// delete set of images
window.fn.batchDelete = function() {
    if(selectBuffer.length == 0){
        return;
    }
    var postData = JSON.stringify({ Files: selectBuffer });
    $.ajax({
        type: "post",
        contentType: 'application/json',
        dataType: 'json',
        url: gURL+"/api/del",
        data: postData,
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        success: function(data, stat, req) {
            $.each(selectBuffer,function(index, item) {
                var img = $("img[data-original*='" + item + "']").parent().parent();
                img[0].remove();
                });
            fn.deselectItems();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            ons.notification.alert("Error: " + textStatus);
        },
        timeout: 3000
        });
}

// move files to current folder
window.fn.batchMove = function() {
    if(selectBuffer.length == 0){
        return;
    }
    var postData = JSON.stringify({ Dst: cPath, Files: selectBuffer });
    $.ajax({
        type: "post",
        contentType: 'application/json',
        dataType: 'json',
        url: gURL+"/api/move",
        data: postData,
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        success: function(data, stat, req) {
            fn.deselectItems();
            fn.listImages(cPath);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            ons.notification.alert("Error: " + textStatus);
        },
        timeout: 3000
        });
}

// share image
window.fn.shareImg = function() {
    var path_file = $('#gImgDialog')[0].getAttribute('data-file');
    var file_uri = path_file.match(/f=(.*)/)[1];
    var file = file_uri.substr(file_uri.lastIndexOf('/') + 1);

    var filePa = cordova.file.externalCacheDirectory + file;
    var permissions = cordova.plugins.permissions;
    permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
        if (!status.hasPermission) {
              permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
                    if (!status.hasPermission) {
                              ons.notification.alert("No permissions to write sdcard");
                      } else {
                              gImgDialog.hide();
                              _download(file_uri,filePa);
                              _share(file);
                      }
                }, (err) => {
                    ons.notification.alert("No permissions to write sdcard");
                });
          } else {
            gImgDialog.hide();
            _download(file_uri,filePa);
            _share(file);
          }
    }, null);
}

function _share(file) {
    navigator.share({
        title: file,
        mime: "image/*",
        url: file
        }).then(() => {
            console.log("Data was shared successfully");
        }).catch((err) => {
            console.error("Share failed:", err.message);
        });
}

// select img
window.fn.selectItem = function() {
    var path_file = $('#gImgDialog')[0].getAttribute('data-file').match(/f=(.*)/)[1];
    var sItem = $("img[data-original*='" + path_file + "']");

    gImgDialog.hide();

    if(!selectBuffer.includes(path_file)){
        selectBuffer.push(path_file);
        sItem.after('<span class="gselected"></span>');
        sItem[0].classList.add("selected");
        if(selectBuffer.length == 1){
            $("#toolbar1")[0].style.display="none";
            $("#toolbar2")[0].style.display="inline-block";
        }
    } else {
        var i = selectBuffer.indexOf(path_file);
        if(i > -1) {
            selectBuffer.splice(i,1);
        }
        sItem.next('span').remove();
        sItem[0].classList.remove("selected");
        if(selectBuffer.length == 0){
            $("#toolbar2")[0].style.display="none";
            $("#toolbar1")[0].style.display="inline-block";
        }
    }

    $("#gsel_badge")[0].innerHTML= selectBuffer.length;

    console.log(selectBuffer);
}

window.fn.deselectItems = function() {
    $(".selected").each(function(idx){
        $(this).next("span").remove();
        $(this)[0].classList.remove("selected");
    });
    $("#toolbar2")[0].style.display="none";
    $("#toolbar1")[0].style.display="inline-block";
    selectBuffer = [];
}


// get image info
window.fn.infoImg = function() {
    var path_file = $('#gImgDialog')[0].getAttribute('data-file');
    var file = path_file.match(/f=(.*)/)[1];
    $.ajax({
        type: "get",
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        url: gURL+"/api/info?f="+file,
        success: function(res,stat,req){
            var info_div = $("#gItemInfo");
            info_div.empty();
            info_div.append(res.data.message);
            gItemInfo_dialog.show();
            gImgDialog.hide();
        },
        error: function(error){
            gImgDialog.hide();
            console.log(error.responseJSON.data.error.error_message);
        }
        });
}

// get directory info
window.fn.infoDir = function() {
    var path_file = $('#gDirDialog')[0].getAttribute('data-file');
    var file = path_file.match(/f=(.*)/)[1];
    $.ajax({
        type: "get",
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        url: gURL+"/api/info?f="+file,
        success: function(res,stat,req){
            var info_div = $("#gItemInfo");
            info_div.empty();
            info_div.append(res.data.message);
            gItemInfo_dialog.show();
            gDirDialog.hide();
        },
        error: function(error){
            gDirDialog.hide();
            console.log(error.responseJSON.data.error.error_message);
        }
        });
}

// delete directory
window.fn.deleteDir = function() {
    var path_file = $('#gDirDialog')[0].getAttribute('data-file');
    var file = path_file.match(/f=(.*)/)[1];
    var img = $("img[src*='" + path_file + "']").parent().parent();
    $.ajax({
        type: "get",
        cache: false,
        xhrFields: { withCredentials: true },
        crossDomain: true,
        url: gURL+"/api/del?f="+file,
        success: function(res,stat,req){
            img[0].remove();
            gDirDialog.hide();
        },
        error: function(error){
            gDirDialog.hide();
            console.log(error.responseJSON.data.error.error_message);
        }
        });
}

//menu/splitter handler
window.fn.open = function() {
  var menu = document.getElementById('menu');
  menu.open();
};

window.fn.load = function(page) {
  var content = document.getElementById('content');
  var menu = document.getElementById('menu');
  content.load(page)
    .then(menu.close.bind(menu));
};

function _fetchPref(prefs, key) {
  return new Promise((resolve,reject) => {
        prefs.fetch((ret) => { resolve(ret); }, () => { console.log("fail"); reject(""); }, key);
    });
}

//login
window.fn.login = async function(srv_name) {
        var srv = await _fetchPref(prefs, srv_name);
        gURL = srv.url;

        console.log("name: " + srv.name);
        console.log("url: " + gURL);

        formData = {
                user: srv.user,
                password: srv.pass
        }
        $.ajax({
                type: "post",
                url: gURL+"/apiAuth",
                data: formData,
                cache: false,
                xhrFields: { withCredentials: true },
                crossDomain: true,
                success: function(data, stat, req) {
                        $("#content").load(path + "pages/images.html", function() {});
                        loggedin = true;
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                            ons.notification.alert("Error: " + textStatus);
                    },
                    timeout: 3000
                });
};

function _addSrv(server)
{
    var servers = [];
    prefs.fetch(
    (ret) => {
        if(ret != null){ servers = ret; }

        if(servers.includes(server)){
            return;
        } else {
            servers.push(server);
            prefs.store(() => { console.log("OK"); }, () => { console.log("fail"); }, 'servers', servers);
        }
    },
    (err) => { console.log(err); }, 'servers');
}

function _delSrv(server)
{
    var servers = [];
    prefs.fetch(
    (ret) => {
        servers = ret;
        var i = servers.indexOf(server);
        if(i > -1) {
            servers.splice(i,1);
            prefs.store(() => { console.log("OK"); }, () => { console.log("fail"); }, 'servers', servers);
        }
    },
    (err) => { console.log(err); }, 'servers');
}

// add galerun server item
window.fn.addServer = function() {
    var srv, srv_pass = '';
    var srv_name = $("#gsrvadd_dialog #servername").val();
    var srv_url = $("#gsrvadd_dialog #serverurl").val();
    var srv_usr = $("#gsrvadd_dialog #serveruser").val();
    srv_pass = $("#gsrvadd_dialog #serverpass").val();

    if (srv_name == "" || srv_url == "" ) {
            ons.notification.alert("Please enter server name & URL");
            return;
    }

    srv = { name: srv_name, url: srv_url, user: srv_usr, pass: srv_pass };

    _addSrv(srv_name);
    prefs.store(() => {}, () => { console.log("fail"); }, srv_name, srv);
    gsrvadd_dialog.hide();
}

// update server info
window.fn.updateServer = function() {
    var srv, srv_pass = '';

    var srv_name = $("#gsrvedit_dialog #servername").val();
    var srv_url = $("#gsrvedit_dialog #serverurl").val();
    var srv_usr = $("#gsrvedit_dialog #serveruser").val();
    srv_pass = $("#gsrvedit_dialog #serverpass").val();

    if (srv_name == "" || srv_url == "" ) {
            ons.notification.alert("Please enter server name & URL");
            return;
    }

    srv = { name: srv_name, url: srv_url, user: srv_usr, pass: srv_pass };

    _addSrv(srv_name);
    prefs.store(() => {}, () => { console.log("fail"); }, srv_name, srv);

    gsrvedit_dialog.hide();
}

// delete server
window.fn.deleteServer = function() {
    var srv_name = $("#gsrvedit_dialog #servername").val();

    console.log("removing " + srv_name);
    _delSrv(srv_name);
    prefs.remove(() => {}, (err) => { console.log(err); }, srv_name);

    gsrvedit_dialog.hide();
}

// edit galerun server item
window.fn.editServer = async function(srv_name) {
        var name, url, pass;

        console.log("edit server: " + srv_name);

        var srv = await _fetchPref(prefs, srv_name);

        console.log("name: " + srv.name);
        console.log("url: " + srv.url);

        $('#gsrvedit_dialog #servername').val(srv.name);
        $('#gsrvedit_dialog #serverurl').val(srv.url);
        $('#gsrvedit_dialog #serveruser').val(srv.user);
        $('#gsrvedit_dialog #serverpass').val(srv.pass);
        gsrvedit_dialog.show();
}

//set thumbnails size
window.fn.setThumbSize = function(size) {
    thumbScale = size;

    switch(size) {
        case THUMB_SMALL:
            thumbsToLoad = 80;
            break;
        case THUMB_MEDIUM:
            thumbsToLoad = 40;
            break;
        case THUMB_BIG:
            thumbsToLoad = 10;
            break;
    }

    thumbSize = Math.ceil(screenWidth / thumbScale);
    gthumbSheet.hide();
    fn.listImages(cPath);
}

//list images
window.fn.listImages = function(imgPath, filter) {
    var filter_arg = "";
    cPath = imgPath;
    if(viewer){
        viewer.destroy();
    }
    if(filter) {
        filter_arg = "&f="+filter;
    }
    $.ajax({
        type: "get",
        url: gURL+"/api/list?s="+sortOrder+"&p="+imgPath + filter_arg,
        dataType: "json",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        success: function(data) {
                var div = $('#g-images');
                div.empty();

                var pathElm = imgPath.split("/");
                var out = '';
                var link = '';
                pagesHistory.length = 0;
                $.each(pathElm,function(index, item) {
                    if(index == 0){
                        out += `<span onclick="fn.listImages('/')"> / </span>`;
                        pagesHistory[index] = '/';
                    } else {
                        link += '/';
                        link +=  item;
                        if(item != ""){
                            pagesHistory[index] = link;
                        }
                        out += `<span onclick="fn.listImages('${link}')"> ${item} </span>`;
                    }
                });
                $('#gimg-header').html(out);
                if(imgPath == "/"){
                    imgPath = ""
                }
                var html = '';
                html += '<ons-row>';
                $.each(data, function(index, item) {
                    if(item.type == "f"){
                        html += `<ons-col style="margin-right: 5px;" width="${thumbSize}px" vertical-align="center">
                        <div class="g-img">
                        <img class="unloaded" data-src="${gURL}/api/thumb?w=${thumbSize}&h=${thumbSize}&f=${imgPath}/${item.name}"
                        data-original="${gURL}/api/img?s=${scaleFactor}&f=${imgPath}/${item.name}"
                        onclick="fn.imageClicked(event)" oncontextmenu="fn.imageLongTap(event)">
                        </div>
                        </ons-col>`;
                    } else {
                        html += `<ons-col style="margin-right: 5px;" width="${thumbSize}px">
                        <div class="g-img">
                        <img class="folder" src="${gURL}/api/thumb?w=${thumbSize}&h=${thumbSize}&f=${imgPath}/${item.name}"
                        onclick="fn.listImages('${imgPath}/${item.name}')" oncontextmenu="fn.dirLongTap(event)">
                        <span class="gfolder">${item.name}</span>
                        </div>
                        </ons-col>`;
                        }
                    });
                html += '</ons-row>';
                div.append(html);
                loadImages(thumbsToLoad);
                },
                error: function() {
                    ons.notification.alert("List task failure");
                }
    });
}

var img_count = 0;
//upload images
window.fn.imgUpload = function() {
    var opts = {
        'selectMode': 100, //101=picker image and video , 100=image , 102=video
        'maxSelectCount': 40,
        'maxSelectSize': 188743680, //188743680=180M
        };
    MediaPicker.getMedias(opts, function(imgs) {
    //medias [{mediaType: "image", path:'/storage/emulated/0/DCIM/Camera/2017.jpg', uri:"android retrun uri,ios retrun URL" size: 21993}]
        img_count = imgs.length;
        for(var i = 0; i < imgs.length; i++) {
            _upload(imgs[i].uri);
        }
    }, function(e) { ons.notification.alert(e); });
}

function _upload(fileURI)
{
   var options = new FileUploadOptions();
   options.fileKey = "file";
   options.fileName = fileURI.substr(fileURI.lastIndexOf('/') + 1);
   options.mimeType = "multipart/form-data";
   options.trustAllHosts = true;
   options.chunkedMode = false;
   options.withCredentials = true;
   options.params = { dst: cPath };
   options.headers = { Connection: "close" };

   var uploadUrl=encodeURI(gURL + "/api/upload");
   var progress = document.getElementById('gupload_progress');
   var ft = new FileTransfer();

   ft.onprogress = (pEvent) => {
    if (pEvent.lengthComputable) {
        var perc = (Math.floor(pEvent.loaded / pEvent.total * 100));
        progress.value = perc;
    } else {
        progress.value++;
    }
   };

   ft.upload(fileURI, uploadUrl,
    (win) => { img_count--;
        if(img_count == 0){
            fn.listImages(cPath);
            progress.value = 0;
        }
    },
    (err) => { progress.value = 0; ons.notification.alert("Error: " + err.code + err.source + err.target); },
    options);

}

//download file
window.fn.downloadImg = function() {
    var path_file = $('#gImgDialog')[0].getAttribute('data-file');
    var file_uri = path_file.match(/f=(.*)/)[1];
    var fileName = file_uri.substr(file_uri.lastIndexOf('/') + 1);

    var filePa = cordova.file.externalRootDirectory + dlPath + "/" + fileName;
    var permissions = cordova.plugins.permissions;
    permissions.checkPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
        if (!status.hasPermission) {
              permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
                    if (!status.hasPermission) {
                              ons.notification.alert("No permissions to write sdcard");
                      } else {
                              _download(file_uri,filePa)
                              gImgDialog.hide();
                      }
                }, (err) => {
                    ons.notification.alert("No permissions to write sdcard");
                });
          } else {
            _download(file_uri,filePa);
            gImgDialog.hide();
          }
    }, null);
}

function _download(file_uri, dst) {
    var ft = new FileTransfer();
    var uri = encodeURI(gURL + "/api/img?f=" + file_uri);
    var progress = document.getElementById('gupload_progress');

    ft.onprogress = (pEvent) => {
    if (pEvent.lengthComputable) {
        var perc = (Math.floor(pEvent.loaded / pEvent.total * 100));
        progress.value = perc;
    } else {
//        progress.value = progress;
        }
    };
    ft.download(
        uri,
        dst,
        function(entry) {
            progress.value = 0;
            console.log("download complete: " + entry.toURL());
        },
        function(error) {
            progress.value = 0;
            console.log("download error source " + error.source);
            console.log("download error target " + error.target);
            console.log("download error code" + error.code);
        },
        true
        );
}