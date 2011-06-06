Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

function FireMarkerEditor(parent, pathLineMode){
  var readOnly     = !/\+$/.test(pathLineMode);
  var pathStr      = pathLineMode.replace(/\+$/,'');
  var lineNumRE    = /:([\d]+)$/;
  var lineNum      = lineNumRE.exec(pathStr)[1];
  if (lineNum) {
    pathStr        = pathStr.replace(lineNumRE, '');
    this.lineNum   = parseInt(lineNum);
  }
  this.filePath    = decodeURI(pathStr);
  var opts         = { lineNumbers: true,
                       readOnly: readOnly,
                       mode: "erb",
                       document: parent.ownerDocument
                     };
  this.editor      = CodeMirror(parent, opts);
  this.wrapper     = this.editor.getWrapperElement();
  if ( !this.readFile() ) { parent.removeChild( this.wrapper ) }
}

FireMarkerEditor.prototype = {

  promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                           .getService(Components.interfaces.nsIPromptService),
  newFile: function() {
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(this.filePath);
    return file;
  },

  readFile: function() {
    var file         = this.newFile();
    this.lastMod     = file.lastModifiedTime;
    var self         = this;
    var readCallback = function(inputStream, status) {
      var content = NetUtil.readInputStreamToString(inputStream, inputStream.available());
      self.editor.setValue(content);
      self.editor.setOption("onChange", function(editor){ editor.changed = true} );
      if (self.lineNum != null) {
        self.wrapper.scrollTop = self.wrapper.firstChild.clientHeight;
        var curLine   = self.lineNum-1
        var curLenght = self.editor.getLine(curLine).length;
        self.editor.setSelection({line: curLine, ch: 0},
                                 {line: curLine, ch: curLenght});
        self.wrapper.scrollLeft = 0;
      }
    };
    try {
      NetUtil.asyncFetch(file, readCallback);
      return true;
    } catch(e) {
      this.promptService.alert(window, "Can't read file",
                                       "Error trying to read file: " + self.filePath + '\n\n(' + e.message +')' );
      return false;
    }
  },

  writeFile: function() {
    if (!this.editor.changed) return;
    var file = this.newFile();
    if ( file.lastModifiedTime != this.lastMod ) {
      var confirm = this.promptService.confirm(window, "Changed File",  "Another process modified this file. Do you want to overwrite it?");
      if (! confirm) { return null }
    }
    var data          = this.editor.getValue() ;
    var ostream       = FileUtils.openSafeFileOutputStream(file, FileUtils.MODE_WRONLY);
    var converter     = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var istream       = converter.convertToInputStream(data);
    var self          = this;
    var writeCallback = function() { self.editor.changed = false };
    try {
      NetUtil.asyncCopy(istream, ostream, writeCallback);
    } catch(e) {
      this.promptService.alert(window, "Can't write file",
                                       "Error trying to write file: " + self.filePath + '\n\n(' + e.message +')' );
    }
  },

  closeEditor: function() {
    this.editor.changed &&
    this.promptService.confirm(window, "Save File", "Would you like to save the changes you made in this file?") &&
    this.writeFile()
  }

};

