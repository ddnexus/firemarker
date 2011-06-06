CodeMirror.defineMode("erb", function(config, parserConfig) {
  var inErb = false;
  var erbOverlay = {
    token: function(stream, state) {
      if (inErb && stream.sol() || stream.match("<%")) {
        inErb = true;
        while ((ch = stream.next()) != null) {
          if (ch == "%" && stream.next() == ">") {
            inErb = false;
            break;
          }
        }
        return "erb";
      }
      while (stream.next() != null && !stream.match("<%", false)) {}
      return null;
    }
  };
  return CodeMirror.overlayParser(CodeMirror.getMode(config, parserConfig.backdrop || "text/html"), erbOverlay);
});
