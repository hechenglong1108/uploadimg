
(function (win, doc) {

  function UploadFile(_config,_callback){
    if(!_config){
      return;
    }

    this.filename = _config.filename || "file";
    this.url = _config.url;
    this.data = _config.data || null;
    this._callback = _callback;
    this.type = _config.type || "post";
    this.url = _config.url;

    var input = document.createElement('input');
    input.setAttribute("type","file");
    //加入跳去APP相册和摄像头的功能和限制只允许上传图片
    input.setAttribute("accept","image/*");
    //android 需要加入capture属性  ios 不需要
    // if (!!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    //     input.removeAttribute("capture");
    // } else {
    //     input.setAttribute("capture","camera");
    // }
    var inputid = _config.clickDom.slice(1,_config.clickDom.length-1) + "file";
    input.setAttribute("id",inputid);
    this.parentdom = document.querySelector(_config.clickDom);
    this.parentdom.appendChild(input)
    this.filechooser = document.querySelector('#' + inputid);
    this.filechooser.style.opacity = 0;
    //    用于压缩图片的canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext('2d');
    //    瓦片canvas
    this.tCanvas = document.createElement("canvas");
    this.tctx = this.tCanvas.getContext("2d");
    this.maxsize = 100 * 1024;
    this.name = "";
    this.shadeId = _config.clickDom.slice(1,_config.clickDom.length-1) + "shadeId";
    this.init();
  }


  //绘制遮罩层
  UploadFile.prototype.shade = function(){
    var box = document.createElement("div");
    box.setAttribute("id",this.shadeId);
    box.style.position = 'fixed';
    box.style.right = "0";
    box.style.left = "0";
    box.style.top = "0";
    box.style.bottom = "0";
    box.style.background = 'rgba(0,0,0,0.7)'
    box.style.display = 'none';
    var p = document.createElement("p");
    p.innerHTML = '正在上传...';
    p.style.color = '#fff';
    p.style.textAlign = 'center';
    p.style.width = '100%';
    p.style.fontSize = '14px';

    //js画上传动画

    var divs = document.createElement('div');
    divs.style.width = "200px";
    divs.style.height = "200px";
    divs.style.borderRadius = "10px"
    divs.style.background = "#7f7f7f";
    divs.style.margin = "40% auto 20px auto"

    var can = document.createElement('canvas');
    can.style.width = "200px";

    can.style.margin = "10% auto"
    divs.appendChild(can);
    divs.appendChild(p);
    box.appendChild(divs);
    var ctx = can.getContext("2d"),
      w = can.width,
      h = can.height,
      x = w/2,
      y = h/2,
      radius = 30;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0,0,w,h);

    var r = [3,4,4.5,5,6,7];
    var angle = [10,25,45,65,90,120];
    var alpha = [0.25,0.35,0.45,0.65,0.8,1];
    var x1=[],y1=[];

    setInterval(function(){
      ctx.fillStyle = "#7f7f7f";
      ctx.fillRect(0,0,w,h);
      x1 = [];
      y1 = [];
      for(var i = 0; i < r.length; i ++){
        if(angle[i] >= 360) angle[i] = 0;
        ctx.beginPath();
        ctx.font = "1rem sans-serif";
        ctx.fillStyle = "rgba(156,236,255,"+alpha[i]+")";
        x1.push( x + radius*Math.cos(angle[i]*Math.PI/180));
        y1.push( y + radius*Math.sin(angle[i]*Math.PI/180));
        ctx.arc(x1[i],y1[i],r[i],0,2*Math.PI, true);
        ctx.closePath();
        ctx.fill();
        angle[i] += 5;
      }
    },25);





    document.body.appendChild(box);
  },

    UploadFile.prototype.init = function(){
      var _inThis = this;
      _inThis.shade()


      _inThis.parentdom.addEventListener("click",function(e){
        _inThis.filechooser.click();
      })

      this.filechooser.onchange = function(){

        if (!this.files.length) return;
        var files = Array.prototype.slice.call(this.files);
        if (files.length > 9) {
          alert("最多同时只可上传9张图片");
          return;
        }

        var nameArr = this.value.split('\\');
        //显示遮罩
        document.getElementById(_inThis.shadeId).style.display = "block"



        _inThis.name = nameArr[nameArr.length-1];

        files.forEach(function(file, i) {
          if (!/\/(?:jpeg|png|gif)/i.test(file.type)) return;
          var reader = new FileReader();
          // var li = document.createElement("li");
          //          获取图片大小
          var size = file.size / 1024 > 1024 ? (~~(10 * file.size / 1024 / 1024)) / 10 + "MB" : ~~(file.size / 1024) + "KB";
          // li.innerHTML = '<div class="progress"><span></span></div><div class="size">' + size + '</div>';
          // $(".img-list").append($(li));
          reader.onload = function() {
            var result = this.result;
            var img = new Image();
            img.src = result;
            // $(li).css("background-image", "url(" + result + ")");
            //如果图片大小小于100kb，则直接上传
            if (result.length <= _inThis.maxsize) {
              img = null;
              _inThis.upload(result, file.type);
              return;
            }
//      图片加载完毕之后进行压缩，然后上传
            if (img.complete) {
              callback();
            } else {
              img.onload = callback;
            }
            function callback() {
              var data = _inThis.compress(img);
              _inThis.upload(data, file.type);
              img = null;
            }
          };
          reader.readAsDataURL(file);
        })
      }
    }
  //    使用canvas对大图片进行压缩
  UploadFile.prototype.compress= function compress(img) {
    var _inThis = this;
    var initSize = img.src.length;
    var width = img.width;
    var height = img.height;
    //如果图片大于四百万像素，计算压缩比并将大小压至400万以下
    var ratio;
    if ((ratio = width * height / 4000000) > 1) {
      ratio = Math.sqrt(ratio);
      width /= ratio;
      height /= ratio;
    } else {
      ratio = 1;
    }
    _inThis.canvas.width = width;
    _inThis.canvas.height = height;
    //        铺底色
    _inThis.ctx.fillStyle = "#fff";
    _inThis.ctx.fillRect(0, 0, _inThis.canvas.width, _inThis.canvas.height);
    //如果图片像素大于100万则使用瓦片绘制
    var count;
    if ((count = width * height / 1000000) > 1) {
      count = ~~(Math.sqrt(count) + 1); //计算要分成多少块瓦片
      //            计算每块瓦片的宽和高
      var nw = ~~(width / count);
      var nh = ~~(height / count);
      _inThis.tCanvas.width = nw;
      _inThis.tCanvas.height = nh;
      for (var i = 0; i < count; i++) {
        for (var j = 0; j < count; j++) {
          _inThis.tctx.drawImage(img, i * nw * ratio, j * nh * ratio, nw * ratio, nh * ratio, 0, 0, nw, nh);
          _inThis.ctx.drawImage(_inThis.tCanvas, i * nw, j * nh, nw, nh);
        }
      }
    } else {
      _inThis.ctx.drawImage(img, 0, 0, width, height);
    }
    //进行最小压缩
    var ndata = _inThis.canvas.toDataURL('image/jpeg', 1);
    console.log('压缩前：' + initSize);
    console.log('压缩后：' + ndata.length);
    console.log('压缩率：' + ~~(100 * (initSize - ndata.length) / initSize) + "%");
    _inThis.tCanvas.width = _inThis.tCanvas.height = _inThis.canvas.width = _inThis.canvas.height = 0;
    return ndata;
  }
  //    图片上传，将base64的图片转成二进制对象，塞进formdata上传
  UploadFile.prototype.upload = function (basestr, type) {
    var _inThis = this;
    var text = window.atob(basestr.split(",")[1]);
    var buffer = new Uint8Array(text.length);
    var pecent = 0, loop = null;
    for (var i = 0; i < text.length; i++) {
      buffer[i] = text.charCodeAt(i);
    }
    var blob = _inThis.getBlob([buffer], type);
    var xhr = new XMLHttpRequest();
    var formdata = _inThis.getFormData();
    console.log(111111)

    formdata.append(_inThis.filename,blob,_inThis.name);
    if(_inThis.data){
      for(var i in _inThis.data){
        formdata.append(i, _inThis.data[i]);
      }
    }

    xhr.open(_inThis.type, _inThis.url);
    xhr.onreadystatechange = function() {
      _inThis.filechooser.value = "";
      //关闭遮罩
      document.getElementById(_inThis.shadeId).style.display = "none"

      if (xhr.readyState == 4 && xhr.status == 200) {
        var jsonData = JSON.parse(xhr.responseText);

        if(typeof _inThis._callback === "function"){
          _inThis._callback(jsonData)
        }
      }
    };
    xhr.send(formdata);
  }

  /**
   * 获取blob对象的兼容性写法
   * @param buffer
   * @param format
   * @returns {*}
   */
  UploadFile.prototype.getBlob = function (buffer, format) {
    try {
      return new Blob(buffer, {type: format});
    } catch (e) {
      var bb = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder);
      buffer.forEach(function(buf) {
        bb.append(buf);
      });
      return bb.getBlob(format);
    }
  }
  /**
   * 获取formdata
   */

  UploadFile.prototype.getFormData = function () {
    var isNeedShim = ~navigator.userAgent.indexOf('Android')
      && ~navigator.vendor.indexOf('Google')
      && !~navigator.userAgent.indexOf('Chrome')
      && navigator.userAgent.match(/AppleWebKit\/(\d+)/).pop() <= 534;
    return isNeedShim ? new FormDataShim() : new FormData()
  }

  win.UploadFile = UploadFile;

})(window, document);
/*var  a = new UploadFile({
 clickDom:"#click",//点击上传的按钮
 filename:"file",//后台接收图片的参数名
 data:{//参数
 typeName:"汽车前灯",
 pid:84,
 type:"code1527148877462"
 },
 url:"/api/shopCarPic/upload",//路径
 type:"POST"//方式
 },function(json){//回调函数
 alert(1)
 })*/
