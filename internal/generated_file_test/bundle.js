function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var base = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.default = /*istanbul ignore end*/Diff;
function Diff() {}

Diff.prototype = { /*istanbul ignore start*/
  /*istanbul ignore end*/diff: function diff(oldString, newString) {
    /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var callback = options.callback;
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    this.options = options;

    var self = this;

    function done(value) {
      if (callback) {
        setTimeout(function () {
          callback(undefined, value);
        }, 0);
        return true;
      } else {
        return value;
      }
    }

    // Allow subclasses to massage the input prior to running
    oldString = this.castInput(oldString);
    newString = this.castInput(newString);

    oldString = this.removeEmpty(this.tokenize(oldString));
    newString = this.removeEmpty(this.tokenize(newString));

    var newLen = newString.length,
        oldLen = oldString.length;
    var editLength = 1;
    var maxEditLength = newLen + oldLen;
    var bestPath = [{ newPos: -1, components: [] }];

    // Seed editLength = 0, i.e. the content starts with the same values
    var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
      // Identity per the equality and tokenizer
      return done([{ value: newString.join(''), count: newString.length }]);
    }

    // Main worker method. checks all permutations of a given edit length for acceptance.
    function execEditLength() {
      for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
        var basePath = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
        var addPath = bestPath[diagonalPath - 1],
            removePath = bestPath[diagonalPath + 1],
            _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
        if (addPath) {
          // No one else is going to attempt to use this value, clear it
          bestPath[diagonalPath - 1] = undefined;
        }

        var canAdd = addPath && addPath.newPos + 1 < newLen,
            canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;
        if (!canAdd && !canRemove) {
          // If this path is a terminal then prune
          bestPath[diagonalPath] = undefined;
          continue;
        }

        // Select the diagonal that we want to branch from. We select the prior
        // path whose position in the new string is the farthest from the origin
        // and does not pass the bounds of the diff graph
        if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
          basePath = clonePath(removePath);
          self.pushComponent(basePath.components, undefined, true);
        } else {
          basePath = addPath; // No need to clone, we've pulled it from the list
          basePath.newPos++;
          self.pushComponent(basePath.components, true, undefined);
        }

        _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath);

        // If we have hit the end of both strings, then we are done
        if (basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) {
          return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
        } else {
          // Otherwise track this path as a potential candidate and continue.
          bestPath[diagonalPath] = basePath;
        }
      }

      editLength++;
    }

    // Performs the length of edit iteration. Is a bit fugly as this has to support the
    // sync and async mode which is never fun. Loops over execEditLength until a value
    // is produced.
    if (callback) {
      (function exec() {
        setTimeout(function () {
          // This should not happen, but we want to be safe.
          /* istanbul ignore next */
          if (editLength > maxEditLength) {
            return callback();
          }

          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength) {
        var ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/pushComponent: function pushComponent(components, added, removed) {
    var last = components[components.length - 1];
    if (last && last.added === added && last.removed === removed) {
      // We need to clone here as the component clone operation is just
      // as shallow array clone
      components[components.length - 1] = { count: last.count + 1, added: added, removed: removed };
    } else {
      components.push({ count: 1, added: added, removed: removed });
    }
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
    var newLen = newString.length,
        oldLen = oldString.length,
        newPos = basePath.newPos,
        oldPos = newPos - diagonalPath,
        commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
      newPos++;
      oldPos++;
      commonCount++;
    }

    if (commonCount) {
      basePath.components.push({ count: commonCount });
    }

    basePath.newPos = newPos;
    return oldPos;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/equals: function equals(left, right) {
    return left === right;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/removeEmpty: function removeEmpty(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/castInput: function castInput(value) {
    return value;
  },
  /*istanbul ignore start*/ /*istanbul ignore end*/tokenize: function tokenize(value) {
    return value.split('');
  }
};

function buildValues(diff, components, newString, oldString, useLongestToken) {
  var componentPos = 0,
      componentLen = components.length,
      newPos = 0,
      oldPos = 0;

  for (; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (!component.removed) {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function (value, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value.length ? oldValue : value;
        });

        component.value = value.join('');
      } else {
        component.value = newString.slice(newPos, newPos + component.count).join('');
      }
      newPos += component.count;

      // Common case
      if (!component.added) {
        oldPos += component.count;
      }
    } else {
      component.value = oldString.slice(oldPos, oldPos + component.count).join('');
      oldPos += component.count;

      // Reverse add and remove so removes are output first to match common convention
      // The diffing algorithm is tied to add then remove output and this is the simplest
      // route to get the desired output with minimal overhead.
      if (componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos];
        components[componentPos] = tmp;
      }
    }
  }

  // Special case handle for when one terminal is ignored. For this case we merge the
  // terminal into the prior string and drop the change.
  var lastComponent = components[componentLen - 1];
  if (componentLen > 1 && (lastComponent.added || lastComponent.removed) && diff.equals('', lastComponent.value)) {
    components[componentLen - 2].value += lastComponent.value;
    components.pop();
  }

  return components;
}

function clonePath(path) {
  return { newPos: path.newPos, components: path.components.slice(0) };
}

});

var character = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.characterDiff = undefined;
exports. /*istanbul ignore end*/diffChars = diffChars;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/var characterDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/characterDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
function diffChars(oldStr, newStr, callback) {
  return characterDiff.diff(oldStr, newStr, callback);
}

});

var params = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/generateOptions = generateOptions;
function generateOptions(options, defaults) {
  if (typeof options === 'function') {
    defaults.callback = options;
  } else if (options) {
    for (var name in options) {
      /* istanbul ignore else */
      if (options.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
  }
  return defaults;
}

});

var word = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.wordDiff = undefined;
exports. /*istanbul ignore end*/diffWords = diffWords;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWordsWithSpace = diffWordsWithSpace;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

/*istanbul ignore end*/


/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/

// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Ranges and exceptions:
// Latin-1 Supplement, 0080–00FF
//  - U+00D7  × Multiplication sign
//  - U+00F7  ÷ Division sign
// Latin Extended-A, 0100–017F
// Latin Extended-B, 0180–024F
// IPA Extensions, 0250–02AF
// Spacing Modifier Letters, 02B0–02FF
//  - U+02C7  ˇ &#711;  Caron
//  - U+02D8  ˘ &#728;  Breve
//  - U+02D9  ˙ &#729;  Dot Above
//  - U+02DA  ˚ &#730;  Ring Above
//  - U+02DB  ˛ &#731;  Ogonek
//  - U+02DC  ˜ &#732;  Small Tilde
//  - U+02DD  ˝ &#733;  Double Acute Accent
// Latin Extended Additional, 1E00–1EFF
var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;

var reWhitespace = /\S/;

var wordDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/wordDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
wordDiff.equals = function (left, right) {
  return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
};
wordDiff.tokenize = function (value) {
  var tokens = value.split(/(\s+|\b)/);

  // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.
  for (var i = 0; i < tokens.length - 1; i++) {
    // If we have an empty string in the next field and we have only word chars before and after, merge
    if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
      tokens[i] += tokens[i + 2];
      tokens.splice(i + 1, 2);
      i--;
    }
  }

  return tokens;
};

function diffWords(oldStr, newStr, callback) {
  var options = /*istanbul ignore start*/(0, params.generateOptions) /*istanbul ignore end*/(callback, { ignoreWhitespace: true });
  return wordDiff.diff(oldStr, newStr, options);
}
function diffWordsWithSpace(oldStr, newStr, callback) {
  return wordDiff.diff(oldStr, newStr, callback);
}

});

var line = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.lineDiff = undefined;
exports. /*istanbul ignore end*/diffLines = diffLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffTrimmedLines = diffTrimmedLines;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

/*istanbul ignore end*/


/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/var lineDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/lineDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
lineDiff.tokenize = function (value) {
  var retLines = [],
      linesAndNewlines = value.split(/(\n|\r\n)/);

  // Ignore the final empty token that occurs if the string ends with a new line
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }

  // Merge the content and line separators into single tokens
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line = linesAndNewlines[i];

    if (i % 2 && !this.options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      if (this.options.ignoreWhitespace) {
        line = line.trim();
      }
      retLines.push(line);
    }
  }

  return retLines;
};

function diffLines(oldStr, newStr, callback) {
  return lineDiff.diff(oldStr, newStr, callback);
}
function diffTrimmedLines(oldStr, newStr, callback) {
  var options = /*istanbul ignore start*/(0, params.generateOptions) /*istanbul ignore end*/(callback, { ignoreWhitespace: true });
  return lineDiff.diff(oldStr, newStr, options);
}

});

var sentence = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.sentenceDiff = undefined;
exports. /*istanbul ignore end*/diffSentences = diffSentences;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/var sentenceDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/sentenceDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
sentenceDiff.tokenize = function (value) {
  return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};

function diffSentences(oldStr, newStr, callback) {
  return sentenceDiff.diff(oldStr, newStr, callback);
}

});

var css = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.cssDiff = undefined;
exports. /*istanbul ignore end*/diffCss = diffCss;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/var cssDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/cssDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
cssDiff.tokenize = function (value) {
  return value.split(/([{}:;,]|\s+)/);
};

function diffCss(oldStr, newStr, callback) {
  return cssDiff.diff(oldStr, newStr, callback);
}

});

var json = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.jsonDiff = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports. /*istanbul ignore end*/diffJson = diffJson;
/*istanbul ignore start*/exports. /*istanbul ignore end*/canonicalize = canonicalize;



/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

/*istanbul ignore end*/


/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/

var objectPrototypeToString = Object.prototype.toString;

var jsonDiff = /*istanbul ignore start*/exports. /*istanbul ignore end*/jsonDiff = new /*istanbul ignore start*/_base2.default() /*istanbul ignore end*/;
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

jsonDiff.tokenize = /*istanbul ignore start*/line.lineDiff. /*istanbul ignore end*/tokenize;
jsonDiff.castInput = function (value) {
  return typeof value === 'string' ? value : JSON.stringify(canonicalize(value), undefined, '  ');
};
jsonDiff.equals = function (left, right) {
  return (/*istanbul ignore start*/_base2.default. /*istanbul ignore end*/prototype.equals(left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'))
  );
};

function diffJson(oldObj, newObj, callback) {
  return jsonDiff.diff(oldObj, newObj, callback);
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed.
function canonicalize(obj, stack, replacementStack) {
  stack = stack || [];
  replacementStack = replacementStack || [];

  var i = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  for (i = 0; i < stack.length; i += 1) {
    if (stack[i] === obj) {
      return replacementStack[i];
    }
  }

  var canonicalizedObj = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  if ('[object Array]' === objectPrototypeToString.call(obj)) {
    stack.push(obj);
    canonicalizedObj = new Array(obj.length);
    replacementStack.push(canonicalizedObj);
    for (i = 0; i < obj.length; i += 1) {
      canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
    return canonicalizedObj;
  }

  if (obj && obj.toJSON) {
    obj = obj.toJSON();
  }

  if ( /*istanbul ignore start*/(typeof /*istanbul ignore end*/obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    replacementStack.push(canonicalizedObj);
    var sortedKeys = [],
        key = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
    for (key in obj) {
      /* istanbul ignore else */
      if (obj.hasOwnProperty(key)) {
        sortedKeys.push(key);
      }
    }
    sortedKeys.sort();
    for (i = 0; i < sortedKeys.length; i += 1) {
      key = sortedKeys[i];
      canonicalizedObj[key] = canonicalize(obj[key], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
  } else {
    canonicalizedObj = obj;
  }
  return canonicalizedObj;
}

});

var parse = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/parsePatch = parsePatch;
function parsePatch(uniDiff) {
  /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var diffstr = uniDiff.split('\n'),
      list = [],
      i = 0;

  function parseIndex() {
    var index = {};
    list.push(index);

    // Parse diff metadata
    while (i < diffstr.length) {
      var line = diffstr[i];

      // File header found, end parsing diff metadata
      if (/^(\-\-\-|\+\+\+|@@)\s/.test(line)) {
        break;
      }

      // Diff index
      var header = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(line);
      if (header) {
        index.index = header[1];
      }

      i++;
    }

    // Parse file headers if they are defined. Unified diff requires them, but
    // there's no technical issues to have an isolated hunk without file header
    parseFileHeader(index);
    parseFileHeader(index);

    // Parse hunks
    index.hunks = [];

    while (i < diffstr.length) {
      var _line = diffstr[i];

      if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(_line)) {
        break;
      } else if (/^@@/.test(_line)) {
        index.hunks.push(parseHunk());
      } else if (_line && options.strict) {
        // Ignore unexpected content unless in strict mode
        throw new Error('Unknown line ' + (i + 1) + ' ' + JSON.stringify(_line));
      } else {
        i++;
      }
    }
  }

  // Parses the --- and +++ headers, if none are found, no lines
  // are consumed.
  function parseFileHeader(index) {
    var fileHeader = /^(\-\-\-|\+\+\+)\s+(\S*)\s?(.*?)\s*$/.exec(diffstr[i]);
    if (fileHeader) {
      var keyPrefix = fileHeader[1] === '---' ? 'old' : 'new';
      index[keyPrefix + 'FileName'] = fileHeader[2];
      index[keyPrefix + 'Header'] = fileHeader[3];

      i++;
    }
  }

  // Parses a hunk
  // This assumes that we are at the start of a hunk.
  function parseHunk() {
    var chunkHeaderIndex = i,
        chunkHeaderLine = diffstr[i++],
        chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    var hunk = {
      oldStart: +chunkHeader[1],
      oldLines: +chunkHeader[2] || 1,
      newStart: +chunkHeader[3],
      newLines: +chunkHeader[4] || 1,
      lines: []
    };

    var addCount = 0,
        removeCount = 0;
    for (; i < diffstr.length; i++) {
      var operation = diffstr[i][0];

      if (operation === '+' || operation === '-' || operation === ' ' || operation === '\\') {
        hunk.lines.push(diffstr[i]);

        if (operation === '+') {
          addCount++;
        } else if (operation === '-') {
          removeCount++;
        } else if (operation === ' ') {
          addCount++;
          removeCount++;
        }
      } else {
        break;
      }
    }

    // Handle the empty block count case
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }

    // Perform optional sanity checking
    if (options.strict) {
      if (addCount !== hunk.newLines) {
        throw new Error('Added line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
      if (removeCount !== hunk.oldLines) {
        throw new Error('Removed line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
    }

    return hunk;
  }

  while (i < diffstr.length) {
    parseIndex();
  }

  return list;
}

});

var distanceIterator = createCommonjsModule(function (module, exports) {

exports.__esModule = true;

exports.default = /*istanbul ignore end*/function (start, minLine, maxLine) {
  var wantForward = true,
      backwardExhausted = false,
      forwardExhausted = false,
      localOffset = 1;

  return function iterator() {
    if (wantForward && !forwardExhausted) {
      if (backwardExhausted) {
        localOffset++;
      } else {
        wantForward = false;
      }

      // Check if trying to fit beyond text length, and if not, check it fits
      // after offset location (or desired location on first iteration)
      if (start + localOffset <= maxLine) {
        return localOffset;
      }

      forwardExhausted = true;
    }

    if (!backwardExhausted) {
      if (!forwardExhausted) {
        wantForward = true;
      }

      // Check if trying to fit before text beginning, and if not, check it fits
      // before offset location
      if (minLine <= start - localOffset) {
        return - localOffset++;
      }

      backwardExhausted = true;
      return iterator();
    }

    // We tried to fit hunk before text beginning and beyond text lenght, then
    // hunk can't fit on the text. Return undefined
  };
};

});

var apply = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/applyPatch = applyPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatches = applyPatches;





/*istanbul ignore start*/
var _distanceIterator2 = _interopRequireDefault(distanceIterator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*istanbul ignore end*/function applyPatch(source, uniDiff) {
  /*istanbul ignore start*/var /*istanbul ignore end*/options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  if (typeof uniDiff === 'string') {
    uniDiff = /*istanbul ignore start*/(0, parse.parsePatch) /*istanbul ignore end*/(uniDiff);
  }

  if (Array.isArray(uniDiff)) {
    if (uniDiff.length > 1) {
      throw new Error('applyPatch only works with a single input.');
    }

    uniDiff = uniDiff[0];
  }

  // Apply the diff to the input
  var lines = source.split('\n'),
      hunks = uniDiff.hunks,
      compareLine = options.compareLine || function (lineNumber, line, operation, patchContent) /*istanbul ignore start*/{
    return (/*istanbul ignore end*/line === patchContent
    );
  },
      errorCount = 0,
      fuzzFactor = options.fuzzFactor || 0,
      minLine = 0,
      offset = 0,
      removeEOFNL = /*istanbul ignore start*/void 0 /*istanbul ignore end*/,
      addEOFNL = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;

  /**
   * Checks if the hunk exactly fits on the provided location
   */
  function hunkFits(hunk, toPos) {
    for (var j = 0; j < hunk.lines.length; j++) {
      var line = hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ' || operation === '-') {
        // Context sanity check
        if (!compareLine(toPos + 1, lines[toPos], operation, content)) {
          errorCount++;

          if (errorCount > fuzzFactor) {
            return false;
          }
        }
        toPos++;
      }
    }

    return true;
  }

  // Search best fit offsets for each hunk based on the previous ones
  for (var i = 0; i < hunks.length; i++) {
    var hunk = hunks[i],
        maxLine = lines.length - hunk.oldLines,
        localOffset = 0,
        toPos = offset + hunk.oldStart - 1;

    var iterator = /*istanbul ignore start*/(0, _distanceIterator2.default) /*istanbul ignore end*/(toPos, minLine, maxLine);

    for (; localOffset !== undefined; localOffset = iterator()) {
      if (hunkFits(hunk, toPos + localOffset)) {
        hunk.offset = offset += localOffset;
        break;
      }
    }

    if (localOffset === undefined) {
      return false;
    }

    // Set lower text limit to end of the current hunk, so next ones don't try
    // to fit over already patched text
    minLine = hunk.offset + hunk.oldStart + hunk.oldLines;
  }

  // Apply patch hunks
  for (var _i = 0; _i < hunks.length; _i++) {
    var _hunk = hunks[_i],
        _toPos = _hunk.offset + _hunk.newStart - 1;
    if (_hunk.newLines == 0) {
      _toPos++;
    }

    for (var j = 0; j < _hunk.lines.length; j++) {
      var line = _hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ') {
        _toPos++;
      } else if (operation === '-') {
        lines.splice(_toPos, 1);
        /* istanbul ignore else */
      } else if (operation === '+') {
          lines.splice(_toPos, 0, content);
          _toPos++;
        } else if (operation === '\\') {
          var previousOperation = _hunk.lines[j - 1] ? _hunk.lines[j - 1][0] : null;
          if (previousOperation === '+') {
            removeEOFNL = true;
          } else if (previousOperation === '-') {
            addEOFNL = true;
          }
        }
    }
  }

  // Handle EOFNL insertion/removal
  if (removeEOFNL) {
    while (!lines[lines.length - 1]) {
      lines.pop();
    }
  } else if (addEOFNL) {
    lines.push('');
  }
  return lines.join('\n');
}

// Wrapper that supports multiple file patches via callbacks.
function applyPatches(uniDiff, options) {
  if (typeof uniDiff === 'string') {
    uniDiff = /*istanbul ignore start*/(0, parse.parsePatch) /*istanbul ignore end*/(uniDiff);
  }

  var currentIndex = 0;
  function processIndex() {
    var index = uniDiff[currentIndex++];
    if (!index) {
      return options.complete();
    }

    options.loadFile(index, function (err, data) {
      if (err) {
        return options.complete(err);
      }

      var updatedContent = applyPatch(data, index, options);
      options.patched(index, updatedContent);

      setTimeout(processIndex, 0);
    });
  }
  processIndex();
}

});

var create = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/structuredPatch = structuredPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createTwoFilesPatch = createTwoFilesPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createPatch = createPatch;



/*istanbul ignore start*/
function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*istanbul ignore end*/function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (!options) {
    options = { context: 4 };
  }

  var diff = /*istanbul ignore start*/(0, line.diffLines) /*istanbul ignore end*/(oldStr, newStr);
  diff.push({ value: '', lines: [] }); // Append an empty value to make cleanup easier

  function contextLines(lines) {
    return lines.map(function (entry) {
      return ' ' + entry;
    });
  }

  var hunks = [];
  var oldRangeStart = 0,
      newRangeStart = 0,
      curRange = [],
      oldLine = 1,
      newLine = 1;
  /*istanbul ignore start*/
  var _loop = function _loop( /*istanbul ignore end*/i) {
    var current = diff[i],
        lines = current.lines || current.value.replace(/\n$/, '').split('\n');
    current.lines = lines;

    if (current.added || current.removed) {
      /*istanbul ignore start*/
      var _curRange;

      /*istanbul ignore end*/
      // If we have previous context, start with that
      if (!oldRangeStart) {
        var prev = diff[i - 1];
        oldRangeStart = oldLine;
        newRangeStart = newLine;

        if (prev) {
          curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [];
          oldRangeStart -= curRange.length;
          newRangeStart -= curRange.length;
        }
      }

      // Output our changes
      /*istanbul ignore start*/(_curRange = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/lines.map(function (entry) {
        return (current.added ? '+' : '-') + entry;
      })));

      // Track the updated file position
      if (current.added) {
        newLine += lines.length;
      } else {
        oldLine += lines.length;
      }
    } else {
      // Identical context lines. Track line changes
      if (oldRangeStart) {
        // Close out any changes that have been output (or join overlapping)
        if (lines.length <= options.context * 2 && i < diff.length - 2) {
          /*istanbul ignore start*/
          var _curRange2;

          /*istanbul ignore end*/
          // Overlapping
          /*istanbul ignore start*/(_curRange2 = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange2 /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/contextLines(lines)));
        } else {
          /*istanbul ignore start*/
          var _curRange3;

          /*istanbul ignore end*/
          // end the range and output
          var contextSize = Math.min(lines.length, options.context);
          /*istanbul ignore start*/(_curRange3 = /*istanbul ignore end*/curRange).push. /*istanbul ignore start*/apply /*istanbul ignore end*/( /*istanbul ignore start*/_curRange3 /*istanbul ignore end*/, /*istanbul ignore start*/_toConsumableArray( /*istanbul ignore end*/contextLines(lines.slice(0, contextSize))));

          var hunk = {
            oldStart: oldRangeStart,
            oldLines: oldLine - oldRangeStart + contextSize,
            newStart: newRangeStart,
            newLines: newLine - newRangeStart + contextSize,
            lines: curRange
          };
          if (i >= diff.length - 2 && lines.length <= options.context) {
            // EOF is inside this hunk
            var oldEOFNewline = /\n$/.test(oldStr);
            var newEOFNewline = /\n$/.test(newStr);
            if (lines.length == 0 && !oldEOFNewline) {
              // special case: old has no eol and no trailing context; no-nl can end up before adds
              curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file');
            } else if (!oldEOFNewline || !newEOFNewline) {
              curRange.push('\\ No newline at end of file');
            }
          }
          hunks.push(hunk);

          oldRangeStart = 0;
          newRangeStart = 0;
          curRange = [];
        }
      }
      oldLine += lines.length;
      newLine += lines.length;
    }
  };

  for (var i = 0; i < diff.length; i++) {
    /*istanbul ignore start*/
    _loop( /*istanbul ignore end*/i);
  }

  return {
    oldFileName: oldFileName, newFileName: newFileName,
    oldHeader: oldHeader, newHeader: newHeader,
    hunks: hunks
  };
}

function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  var diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);

  var ret = [];
  if (oldFileName == newFileName) {
    ret.push('Index: ' + oldFileName);
  }
  ret.push('===================================================================');
  ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader));
  ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader));

  for (var i = 0; i < diff.hunks.length; i++) {
    var hunk = diff.hunks[i];
    ret.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
    ret.push.apply(ret, hunk.lines);
  }

  return ret.join('\n') + '\n';
}

function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
  return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
}

});

var dmp = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/convertChangesToDMP = convertChangesToDMP;
// See: http://code.google.com/p/google-diff-match-patch/wiki/API
function convertChangesToDMP(changes) {
  var ret = [],
      change = /*istanbul ignore start*/void 0 /*istanbul ignore end*/,
      operation = /*istanbul ignore start*/void 0 /*istanbul ignore end*/;
  for (var i = 0; i < changes.length; i++) {
    change = changes[i];
    if (change.added) {
      operation = 1;
    } else if (change.removed) {
      operation = -1;
    } else {
      operation = 0;
    }

    ret.push([operation, change.value]);
  }
  return ret;
}

});

var xml = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports. /*istanbul ignore end*/convertChangesToXML = convertChangesToXML;
function convertChangesToXML(changes) {
  var ret = [];
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    if (change.added) {
      ret.push('<ins>');
    } else if (change.removed) {
      ret.push('<del>');
    }

    ret.push(escapeHTML(change.value));

    if (change.added) {
      ret.push('</ins>');
    } else if (change.removed) {
      ret.push('</del>');
    }
  }
  return ret.join('');
}

function escapeHTML(s) {
  var n = s;
  n = n.replace(/&/g, '&amp;');
  n = n.replace(/</g, '&lt;');
  n = n.replace(/>/g, '&gt;');
  n = n.replace(/"/g, '&quot;');

  return n;
}

});

var lib = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.canonicalize = exports.convertChangesToXML = exports.convertChangesToDMP = exports.parsePatch = exports.applyPatches = exports.applyPatch = exports.createPatch = exports.createTwoFilesPatch = exports.structuredPatch = exports.diffJson = exports.diffCss = exports.diffSentences = exports.diffTrimmedLines = exports.diffLines = exports.diffWordsWithSpace = exports.diffWords = exports.diffChars = exports.Diff = undefined;
/*istanbul ignore end*/


/*istanbul ignore start*/
var _base2 = _interopRequireDefault(base);

/*istanbul ignore end*/






















/*istanbul ignore start*/
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* See LICENSE file for terms of use */

/*
 * Text diff implementation.
 *
 * This library supports the following APIS:
 * JsDiff.diffChars: Character by character diff
 * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
 * JsDiff.diffLines: Line based diff
 *
 * JsDiff.diffCss: Diff targeted at CSS content
 *
 * These methods are based on the implementation proposed in
 * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 */
exports. /*istanbul ignore end*/Diff = _base2.default;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffChars = character.diffChars;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWords = word.diffWords;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffWordsWithSpace = word.diffWordsWithSpace;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffLines = line.diffLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffTrimmedLines = line.diffTrimmedLines;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffSentences = sentence.diffSentences;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffCss = css.diffCss;
/*istanbul ignore start*/exports. /*istanbul ignore end*/diffJson = json.diffJson;
/*istanbul ignore start*/exports. /*istanbul ignore end*/structuredPatch = create.structuredPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createTwoFilesPatch = create.createTwoFilesPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/createPatch = create.createPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatch = apply.applyPatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/applyPatches = apply.applyPatches;
/*istanbul ignore start*/exports. /*istanbul ignore end*/parsePatch = parse.parsePatch;
/*istanbul ignore start*/exports. /*istanbul ignore end*/convertChangesToDMP = dmp.convertChangesToDMP;
/*istanbul ignore start*/exports. /*istanbul ignore end*/convertChangesToXML = xml.convertChangesToXML;
/*istanbul ignore start*/exports. /*istanbul ignore end*/canonicalize = json.canonicalize;

});

// objects and functions for formatting diffs with partial context.  see the 'makeHunks()' documentation, below

function calcLen (linechanges, ab) {
    let len = 0;
    for (let ci = 0; ci < linechanges.length; ci++) {
        switch (linechanges[ci].type) {
            case REMOVED:
                len += ab[0];
                break
            case ADDED:
                len += ab[1];
                break
            case UNMODIFIED:
                len++;
                break
            default:
                throw Error('unknown change type: ' + linechanges[ci].type)
        }
    }
    return len
}

function Hunk (aoff, boff, changes) {
    this.changes = changes;
    this.aoff = aoff;
    this.boff = boff;
    this._alen = -1;
    this._blen = -1;
}

Object.defineProperty (Hunk.prototype, 'alen', {
    get: function () { return this._alen === -1 ? (this._alen = calcLen(this.changes, [1,0])) : this._alen }
});

Object.defineProperty (Hunk.prototype, 'blen', {
    get: function () { return this._blen === -1 ? (this._blen = calcLen(this.changes, [0,1])) : this._blen }
});

Hunk.prototype.unified = function () {
    let ret = [this.unifiedHeader()];
    this.changes.forEach(function(c) {
        ret.push(c.unified());
    });
    // console.log("expect:\n'" + ret.join("'\n'") + "'")   // useful for creating test output
    return ret.join('\n')
};

Hunk.prototype.unifiedHeader = function () {
    let alen = this.alen === 1 ? '' : ',' + this.alen;
    let blen = this.blen === 1 ? '' : ',' + this.blen;
    // empty hunks show zeroith line (prior).  hunks with lines show first line number
    let afudg = this.alen === 0 ? 0 : 1;
    let bfudg = this.blen === 0 ? 0 : 1;
    return '@@ -' + (this.aoff+afudg) + alen + ' +' + (this.boff+bfudg) + blen + ' @@'
};

Hunk.prototype.shorthand = function () {
    return this.changes.reduce(function(s,c){ return s + c.type }, '')
};

Hunk.prototype.toString = function () {
    return "{" + this.shorthand() + "} " + this.unifiedHeader()
};

const ADDED = '+';
const REMOVED = '-';
const UNMODIFIED = 's';

function type2unified (type) { return type === 's' ? ' ' : type }

// LineChange objects represent a single line of change.  Converting diff.diffLine() result array into LineChange
// object array:
//
//    1.  simplifies logic that needs work with lines
//    2.  separates this extension module from specific dependency on the diff library
function LineChange (type, text) {
    this.type = type;   // ADDED, REMOVED, UNMODIFIED
    this.text = text;
}
LineChange.prototype.unified = function () {
    return type2unified(this.type) + this.text
};
LineChange.prototype.toString = function () {  return this.unified() };

// convert a single change from diff.diffLines() into a single line string
// (handy for debugging)
function change2string (c, maxwidth) {
    maxwidth = maxwidth || 60;
    let ret = c.count + ': ' + type2unified(c.type);
    let lim = Math.min(maxwidth - ret.length, c.value.length-1); // remove last newline
    let txt = c.value.substring(0,lim).replace(/\n/g, ',') + (c.value.length > (lim+1) ? '...' : '');
    return  ret + txt
}

// Convert a change as returned from diff.diffLines() into an LineChange objects with offset information.
//
//     change    - object returned from diff.diffLines() containing one or more lines of change info
//     select    - (int)
//                  positive, return up to this many lines from the start of change.
//                  negative, return up to this many lines from the end of the change.
//                  zero, return empty array
//                  undefined, return all lines
//
function lineChanges (change, select) {
    // debug:
    // console.log(change2str(change) + (select === undefined ? '' : '  (select:' + select + ')'))
    if (select === 0) {
        return []
    }
    let lines = [];
    let v = change.value;
    if (select === undefined) {
        lines = v.split('\n');
        if (!lines[lines.length-1]) { lines.pop(); }  // remove terminating new line
    } else if(select > 0) {
        let i = nthIndexOf(v, '\n', 0, select, false);
        lines = v.substring(0,i).split('\n');
    } else {
        let len = v[v.length-1] === '\n' ? v.length-1 : v.length;
        let i = nthIndexOf(v, '\n', len-1, -select, true);
        lines = v.substring(i+1, len).split('\n');
    }
    return lines.map(function (line){ return new LineChange(change.type, line)})
}

// convert a list of changes into a shorthand notation like 'ss--+++ss-+ss'
function changes2shorthand (changes) {
    return '{' + changes.reduce(function (s,c) { for(let i=0; i< c.count; i++) s += c.type; return s }, '') + '}'
}

// concat-in-place, a -> b and return b
function concatTo (a, b) {
    Array.prototype.push.apply(b, a);
    return b
}

// Make Hunk objects from changes as returned from a call to unidiff.lineChanges().  Hunks are collections
// of continuous line changes, therefore every hunk after the first marks a gap
// where unmodified context lines are skipped.
//
//      let 's' represent an unmodifed line 'same'
//          '-' represent a removed line
//          '+' represent an added line
//
//      then hunks with a context of 2 could might like this:
//
//             hunk                hunk         hunk
//           ___|____            ___|__        ___|___
//          |        |          |       |     |       |
//       sssss----++ssssssssssssss-ss--sssssssss+++++ssssssssss
//
//      or this:
//
//             hunk              hunk             hunk
//           ___|____       ______|_______     ____|___
//          |        |     |              |   |        |
//          ++++++++sssssssss+++ssss---++sssssss--++++++
//
//      notice that with a context of 2, series of 4 or fewer unmodified lines are included in the same hunk.
//
// basic algo with context of 3, for illustration:
//
//     0. loop (over each block change)
//        modified block:
//           add all modified lines, continue loop 0
//
//        unmodified block:
//           first hunk: collect tail portion, continue
//           subsequent hunks: get head portion, and tail (iff there are more changes)
//              head + tail <= 6 ?
//                 add all to current hunk, continue loop 0
//              head + tail > 6 ?
//                 finish hunk with head portion
//                 start new hunk with tail portion (iff there are more changes), continue loop 0
//
function makeHunks (changes, precontext, postcontext) {

    //console.log('--------\nmakeHunks(' + [changes2shorthand(changes), precontext, postcontext].join(', ') + ')')
    let ret = [];        // completed hunks to return
    let lchanges = [];   // accumulated line changes (continous/no-gap) to put into next hunk
    let lskipped = 0;    // skipped context to take into account in next hunk line numbers
    function finishHunk () {
        if (lchanges.length) {
            let aoff = lskipped, boff = lskipped;
            if (ret.length) {
                let prev = ret[ret.length-1];
                aoff += prev.aoff + prev.alen;
                boff += prev.boff + prev.blen;
            }
            // add hunk and reset state
            ret.push(new Hunk(aoff, boff, lchanges));
            lchanges = [];
            lskipped = 0;
        }
        // else keep state (lskipped) and continue
    }

    for (let ci=0; ci < changes.length; ci++) {
        let change = changes[ci];
        if (change.type === UNMODIFIED) {
            // add context
            let ctx_after  = ci > 0 ? postcontext : 0;              // context lines following previous change
            let ctx_before = ci < changes.length ? precontext : 0;  // context lines preceding next change (iff there are more changes)
            let skip = Math.max(change.count - (ctx_after + ctx_before), 0);
            if (skip > 0) {
                concatTo(lineChanges(change, ctx_after), lchanges);          // finish up previous hunk
                finishHunk();
                concatTo(lineChanges(change, -ctx_before), lchanges);
                lskipped = skip;                                             // remember skipped for next hunk
            } else {
                concatTo(lineChanges(change), lchanges);                     // add all context
            }
        } else {
            concatTo(lineChanges(change), lchanges);                         // add all modifications
        }
    }
    finishHunk();
    //console.log(ret.map(function(h){ return h.toString() }).join('\n'))
    return ret
}

// no safty checks. caller knows that there are at least n occurances of v in s to be found.
// reverse will search from high to low using lastIndexOf().
function nthIndexOf (s, v, from, n, reverse) {
    let d = reverse ? -1 : 1;
    from -= d;
    for (let c=0; c<n; c++) {
        from = reverse ? s.lastIndexOf(v, from + d) : s.indexOf(v, from + d);
    }
    return from
}

// for testing and debugging
var hunk_1 = function (aoff, boff, lchanges) { return new Hunk(aoff, boff, lchanges) };
var linechange = function (type, text) { return new LineChange(type, text)};
var lineChanges_1 = lineChanges;
var change2string_1 = change2string;
var changes2shorthand_1 = changes2shorthand;
var nthIndexOf_1 = nthIndexOf;

// main API
var makeHunks_1 = makeHunks;
var ADDED_1 = ADDED;
var REMOVED_1 = REMOVED;
var UNMODIFIED_1 = UNMODIFIED;

var hunk = {
	hunk: hunk_1,
	linechange: linechange,
	lineChanges: lineChanges_1,
	change2string: change2string_1,
	changes2shorthand: changes2shorthand_1,
	nthIndexOf: nthIndexOf_1,
	makeHunks: makeHunks_1,
	ADDED: ADDED_1,
	REMOVED: REMOVED_1,
	UNMODIFIED: UNMODIFIED_1
};

var unidiff = createCommonjsModule(function (module, exports) {





// return a change type code for the change (returned from diff.diffLines())
function changeType (change) {
    if (change.added) {
        return hunk.ADDED
    } else if (change.removed) {
        return hunk.REMOVED
    } else {
        return hunk.UNMODIFIED
    }
}

// Given changes from a call to diff.diffLines(), assign each change a type code and
// check that no two of same type occur in a row
function checkAndAssignTypes (changes) {
    if (changes.length === 0) { return [] }

    changes[0].type = changeType(changes[0]);
    return changes.reduce(function (a, b, i) {
        b.type = changeType(b);
        if (a.type === b.type) {
            throw Error('repeating change types are not handled: ' + a.type  + ' (at ' + (i-1) + ' and ' + i + ')')
        }
        return b
    })
}


// convert an array of results from diff.diffLines() into text in unified diff format.
// return empty string if there are no changes.
function formatLines (changes, opt) {
    checkAndAssignTypes(changes);
    opt = opt || {};
    opt.aname = opt.aname || 'a';
    opt.bname = opt.bname || 'b';
    let context = (opt.context || opt.context === 0) ? opt.context : 0;
    opt.pre_context = (opt.pre_context || opt.pre_context === 0) ? opt.pre_context : context;
    opt.post_context = (opt.post_context || opt.post_context === 0) ? opt.post_context : context;

    let hunks = hunk.makeHunks(changes, opt.pre_context, opt.post_context);
    if (hunks.length) {
        let ret = [];
        ret.push('--- ' + opt.aname);
        ret.push('+++ ' + opt.bname);
        hunks.forEach(function (h) {
            ret.push(h.unified());
        });
        return ret.join('\n')
    } else {
        return ''
    }
}

// same as jsdiff.diffLines, but returns empty array when there are no changes (instead of an array with a single
// unmodified change object)
function diffLines (a, b, cb) {
    a = Array.isArray(a) ? a.join('\n') + '\n' : a;
    b = Array.isArray(b) ? b.join('\n') + '\n' : b;
    let ret = lib.diffLines(a, b, cb);
    if (ret.length === 1 && !ret[0].added && !ret[0].removed) {
        return []
    } else {
        return ret
    }
}

function diffAsText (a, b, opt) {
    return formatLines(diffLines(a, b), opt)
}

// handy assertion function that asserts that two arrays or two multi-line strings are the same and reports
// differences to console.log in unified format if there are differences.
//
//     actual - array or multi-line string to compare
//     expected - array or multi-line string to compare
//     label - label to clarify output if there are differences
//     okFn - function like tape.ok that takes two arguments:
//         expression - true if OK, false if failed test
//         msg - a one-line message that prints upon failure
//     logFn - function to call with diff output when there are differences (defaults to console.log)
//
function assertEqual (actual, expected, okFn, label, logFn) {
    logFn = logFn || console.log;
    okFn = okFn.ok || okFn;
    let diff = diffAsText(actual, expected, {context: 3, aname: label + " (actual)", bname: label + ' (expected)'});
    okFn(!diff, label);
    if (diff) {
        diff.split('\n').forEach(function (line) {
            logFn('  ' + line);
        });
    }
}

exports.assertEqual = assertEqual;
exports.diffAsText = diffAsText;
exports.formatLines = formatLines;
exports.diffLines = diffLines;

Object.keys(lib).forEach(function (k) {
    if (!exports[k]) {
        exports[k] = lib[k];
    }
});
});

const fs = require('fs');
const path = require('path');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

function main(args) {
  const [mode, golden_no_debug, golden_debug, actual] = args;
  const actualPath = runfiles.resolveWorkspaceRelative(actual);
  const debugBuild = /\/bazel-out\/[^/\s]*-dbg\//.test(actualPath);
  const golden = debugBuild ? golden_debug : golden_no_debug;
  const actualContents = fs.readFileSync(actualPath, 'utf-8').replace(/\r\n/g, '\n');
  const goldenContents =
      fs.readFileSync(runfiles.resolveWorkspaceRelative(golden), 'utf-8').replace(/\r\n/g, '\n');

  if (actualContents === goldenContents) {
    return 0;
  }
  if (mode === '--out') {
    // Write to golden file
    fs.writeFileSync(runfiles.resolveWorkspaceRelative(golden), actualContents);
    console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    return 0;
  }
  if (mode === '--verify') {
    // Generated does not match golden
    const diff = unidiff.diffLines(goldenContents, actualContents);
    let prettyDiff =
        unidiff.formatLines(diff, {aname: `[workspace]/${golden}`, bname: `[bazel-out]/${actual}`});
    if (prettyDiff.length > 5000) {
      prettyDiff = prettyDiff.substr(0, 5000) + '/n...elided...';
    }
    console.error(`Generated output doesn't match:

${prettyDiff}

If the bazel-out content is correct, you can update the workspace file by running:

          bazel run ${debugBuild ? '--compilation_mode=dbg ' : ''}${
        process.env['TEST_TARGET'].replace(/_bin$/, '')}.update
`);
    return 1;
  }
  throw new Error('unknown mode', mode);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
