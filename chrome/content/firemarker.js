FBL.ns(function() {
  with (FBL) {

    function firemarkerPanel() {}

    firemarkerPanel.prototype = extend(Firebug.Panel, {

      template: domplate({
                           header:
                               DIV({"class": "header"}, "$namespace Markers for ", SPAN({class: "tagname"}, "$tagname")),

                           noMarkers:
                               DIV({"id": "firemarker-container"},
                                   TAG("$header", {namespace: "$namespace", tagname: "$tagname"}),
                                   DIV({"class": "note-table no-markers"}, "No marker for $tagname tag.")
                               ),

                           markers:
                               DIV({"id": "firemarker-container"},
                                   TAG("$header", {namespace: "$namespace", tagname: "$tagname"}),
                                   FOR("marker", "$markers",
                                       TABLE({"class": "marker-table",
                                               "_commentNode": "$marker.commentNode",
                                               "onmouseover": "$onMouseOverTable",
                                               "onmouseout": "$onMouseOutTable"},
                                             TBODY({"class": "marker-table-tbody"},
                                                 FOR("note", "$marker.notes",
                                                     TR({"class": "note-row"},
                                                        TD({"class": "note-label"}, "$note.label"),
                                                        TD({"class": "note-value"}, TAG("$note.tag", {value: "$note.value", valueTypeClass: "$note.valueTypeClass"}) )
                                                     )
                                                 )
                                             )
                                       )
                                   )
                               ),

                           pathValue: DIV( {"class": "$valueTypeClass"},
                                           SPAN("\u25B6 "),
                                           A({"onclick": "$toggleEditor"}, "$value")),
                           noteValue: DIV({"class": "$valueTypeClass"},"$value"),

                           onMouseOverTable: function(event) {
                             var table = getAncestorByClass(event.target, "marker-table");
                             if ( !table || this.highlightedMarkerTable === table ){ return null }
                             this.highlightTable(table);
                             this.clearMarkedObjectBoxes();
                             this.cachedMarked = this.marked = Firebug.firemarkerPanel.getMarked(table.commentNode);
                             // var highlighter = new Firebug.Inspector.FrameHighlighter();
                             for(var i = 0; i < this.marked.length; i++){
                               if (this.marked[i].nodeType === 3) {
                                 var text = this.marked[i];
                                 // returns from the onMutateNode event
                                 unwrapObject(text).firebugIgnore = true;
                                 var span = text.ownerDocument.createElement('span');
                                 span.textContent = text.textContent;
                                 text.parentNode.replaceChild(span, text);
                                 // highlighter.highlight(window.content, span, null,
                                 //                       {border: "red", background:"yellow"}, true);
                                 span.parentNode.replaceChild(text, span);
                               } else {
                                 // highlighter.highlight(window.content, this.marked[i], null,
                                 //                       {border: "red", background:"yellow"}, true);
                               }
                               var ioBox = Firebug.firemarkerPanel.mainPanel.ioBox;
                               var objectBox = ioBox.openToObject(this.marked[i]);
                               setClass(objectBox, "firemarker-highlight");
                               scrollIntoCenterView(objectBox);
                             }
                           },

                           clearMarkedObjectBoxes: function(){
                             if (this.cachedMarked == null) return;
                             for(var i = 0; i < this.cachedMarked.length; i++){
                               var objectBox = Firebug.firemarkerPanel.mainPanel.ioBox.createObjectBox(this.cachedMarked[i]);
                               removeClass(objectBox, "firemarker-highlight");
                             }
                             this.cachedMarked = null;
                           },

                           onMouseOutTable: function(event) {
                             var table = getAncestorByClass(event.target, "marker-table");
                             var rect  = table.getBoundingClientRect();
                             if ( event.clientX > rect.left && event.clientX < rect.right &&
                                  event.clientY > rect.top  && event.clientY < rect.bottom ) { return null }
                             this.highlightTable(null);
                             Firebug.Inspector.clearAllHighlights();
                             this.clearMarkedObjectBoxes();
                           },

                           highlightTable: function(table) {
                             if (this.highlightedMarkerTable)
                               removeClass(this.highlightedMarkerTable, "highlighted");
                             this.highlightedMarkerTable = table;
                             if (table) { setClass(table, "highlighted") }
                           },

                           toggleEditor: function(event) {
                             var link    = event.target;
                             var twister = link.previousSibling;
                             var src     = "chrome://firemarker/content/editor.html?" + link.textContent;
                             if (event.ctrlKey || event.altKey){ return Firebug.firemarkerPanel.OpenUriInNewTab(src) }
                             var testRow = link.editorRow;
                             if (testRow) {
                               twister.innerHTML = "\u25B6 ";
                               testRow.parentNode.removeChild(testRow);
                               link.editorRow = null;
                             } else {
                               twister.innerHTML = "\u25BC ";
                               var tBody      = getAncestorByClass(link, "marker-table-tbody");
                               var od         = tBody.ownerDocument;
                               var tr         = od.createElement('TR');
                                 tr.className = "editor-row";
                               var td         = od.createElement('TD');
                                 td.className = "editor-container";
                                 td.colSpan   = "2";
                               var iframe     = od.createElement('IFRAME');
                                 iframe.src   = src;
                                 iframe.className = "editor-iframe";
                                 iframe.addEventListener("mouseover",
                                                         function(e){
                                                           if (e.target === iframe) {
                                                             iframe.contentWindow.editor.wrapper.style.overflow = "auto";
                                                           }
                                                         },
                                                         true);
                                 iframe.addEventListener("mouseout",
                                                         function(e){
                                                           if (e.target === iframe) {
                                                             iframe.contentWindow.editor.wrapper.style.overflow = "hidden";
                                                           }
                                                         },
                                                         true);
                               td.appendChild(iframe);
                               tr.appendChild(td);
                               tBody.appendChild(tr);
                               link.editorRow = tr;
                               var thePanel = getAncestorByClass(tr, "panelNode-firemarker");
                               var top = 0, elm = tr;
                               while( elm != thePanel ) {
                                 top += elm.offsetTop;
                                 elm  = elm.offsetParent;
                               }
                               if (thePanel.clientHeight + thePanel.scrollTop < top + tr.offsetHeight) {
                                 tr.scrollIntoView(false)
                               }
                             }
                           }
                          }),

      name: "firemarker",
      title: "Markers",
      parentPanel: "html",
      namespaces: Firebug.getPref(Firebug.prefDomain, 'firemarker.namespaces').split(' '),
      activeNamespace: Firebug.getPref(Firebug.prefDomain, 'firemarker.activeNamespace'),
      shellCommand: Firebug.getPref(Firebug.prefDomain, 'firemarker.shellCommand'),

      initializeNode: function() {
        Firebug.Panel.initializeNode.apply(this, arguments);
        Firebug.firemarkerPanel = this
      },

      destroyNode: function() {
        Firebug.firemarkerPanel = null;
        Firebug.Panel.destroyNode.apply(this, arguments);
      },

      getOptionsMenuItems: function(context) {
        var options = [];
        for (var i = 0; i < this.namespaces.length; i++)
          options.push(this.namespaceItem(this.namespaces[i]));
        return options;
      },

      namespaceItem: function(namespace) {
        return {
          name: "namespaces",
          label: namespace,
          nol10n: true,
          type: "radio",
          checked: (this.activeNamespace == namespace),
          command: bindFixed(this.setNamespace, this, namespace)
        };
      },

      setNamespace: function(namespace) {
        this.activeNamespace = namespace;
        Firebug.setPref(Firebug.prefDomain, 'firemarker.activeNamespace', namespace);
        this.updateSelection(this.selection);
      },

      updateSelection: function(objectBox) {
        var data = { namespace: this.activeNamespace.toUpperCase(),
                     tagname:   getElementCSSSelector(objectBox),
                     markers:   this.getMarkers(objectBox) };
        var tmpl = (data.markers.length > 0) ? this.template.markers : this.template.noMarkers;
        tmpl.replace(data, this.panelNode, this.template);
        this.panelNode.scrollTop = 0;
        this.panelNode.scrollLeft = 0;
      },

      getMarkers: function(objectBox) {
        var markers        = [];
        var endMarkerNum   = 0;
        var startMarkerNum = 0;
        var startMarkerRe  = new RegExp('^\\[' + this.activeNamespace + '\\]');
        var endMarkerRe    = new RegExp('^\\[/' + this.activeNamespace + '\\]');
        var curNode        = objectBox;
        var endMarkerIdx   = -1;
        // process start markers data
        while (curNode = curNode.previousSibling || curNode.parentNode) {
          if (curNode.nodeType === 8) {
            if ( startMarkerRe.test(curNode.data) ) {
              if (endMarkerNum > 0) {
                endMarkerNum --
              } else {
                var startMarker = curNode.data.replace(startMarkerRe, '');
                try {
                  startMarker = eval('(' + startMarker + ')');
                  var startNotes = this.getNotes(startMarker);
                } catch(e) {
                  Components.utils.reportError(e);
                }
                var markerObj = {commentNode: curNode, notes: startNotes};
                markers.push(markerObj);
              }
            } else if ( endMarkerRe.test(curNode.data) ) {
              endMarkerNum ++;
            }
          }
        }
        // process end markers data and add to the marker objects
        curNode = objectBox;
        while (curNode = curNode.nextSibling || curNode.parentNode) {
          if (curNode.nodeType === 8) {
            if ( endMarkerRe.test(curNode.data) ) {
              if (startMarkerNum > 0) {
                startMarkerNum --
              } else {
                endMarkerIdx ++;
                var endMarker = curNode.data.replace(endMarkerRe, '');
                try {
                  endMarker = eval('(' + endMarker + ')');
                  var endNotes = this.getNotes(endMarker);
                } catch(e) {
                  Components.utils.reportError(e);
                }
                var startMarkerObj = markers[endMarkerIdx];
                startMarkerObj.notes = startMarkerObj.notes.concat(endNotes);
              }
            } else if ( startMarkerRe.test(curNode.data) ) {
              startMarkerNum ++;
            }
          }
        }
        return markers;
      },

      getNotes: function(marker) {
        var notes = [];
        for (var note in marker) {
          var isPath = (/path$/i).test(note);
          var writable = isPath && /\+$/.test(marker[note]);
          var valueTypeClass = isPath ? (writable ? "writable" : "read-only") : 'text';
          notes.push({ label: note,
                       value: marker[note],
                       tag: isPath ? this.template.pathValue : this.template.noteValue,
                       valueTypeClass: valueTypeClass
                     });
        }
        return notes;
      },

      getMarked: function(startMarkerCommentNode) {
        var childs         = [];
        var startMarkerNum = 0;
        var startMarkerRe  = new RegExp('^\\[' + this.activeNamespace + '\\]');
        var endMarkerRe    = new RegExp('^\\[/' + this.activeNamespace + '\\]');
        var curNode        = startMarkerCommentNode;
        while (curNode = curNode.nextSibling) {
          if (curNode.nodeType === 8) {
            if ( startMarkerRe.test(curNode.data) ) {
              startMarkerNum ++;
            } else if ( endMarkerRe.test(curNode.data) ) {
              if ( startMarkerNum == 0 ) {
                break;
              } else {
                startMarkerNum --;
              }
            }
          } else if ( curNode.nodeType === 1 || (curNode.nodeType === 3 &&! curNode.isElementContentWhitespace) ) {
            childs.push(curNode);
          }
        }
        return childs;
      },

      OpenUriInNewTab: function (strUrl) {
        try {
          var iosvc = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
          var URI = iosvc.newURI(strUrl, null, null);
          return window.browserDOMWindow.openURI(URI, null, 3, 0);
        } catch (err) {
          var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                        .getService(Components.interfaces.nsIPromptService);
          promptService.alert(window, "Can't open new tab", "Error trying to open new tab: " + err);
        }
      }

    });

    Firebug.registerPanel(firemarkerPanel);
    Firebug.registerStylesheet("chrome://firemarker/skin/firemarker.css");
  }
});
