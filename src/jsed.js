class JSED
{
	/* JSED = JavaScript Encoded Data
	   JSED is a file format that fixes the CORS problem for a locally executed 
	   HTML file. AJAX requesting another local asset, such as a JSON file, will
	   fail due to browser security concerns. By encoding the data in the JSED
	   format these problems are solved and the assets can be loaded.
	*/

	static parse(src, onCompleteCallback, async = true, reload = false)
	{
		// This method is called when a JSED file should be parsed and when 
		// the parsing has been completed, a completion callback is called.

		/* The arguments:
				src =					The source of the .jsed file that is to be parsed.

				onCompleteCallback =	The callback that is called, with the parsed data as an
										argument, when the parsing has completed.

				async =					A boolean stating whether the src file should be loaded 
										asynchronously or not.

				reload =				A boolean stating whether previously parsed results can 
										be used or not.
		*/

		if (reload)
		{
			// Clear the state of a src if a reload is requested.

			JSED.clearState(src);
		}

		if (src in JSED._parsedData)
		{
			// Call the completion callbacks if the asset has already
			// been parsed and if it should not be reloaded.

			onCompleteCallback(JSED._parsedData[src]);
		}
		else if (src in JSED._onCompleteCallbacks)
		{
			// If the parsing has already been started, but not finished,
			// then just add the new callback to the callbacks without
			// starting a new parsing process.

			JSED._addOnCompleteCallback(src, onCompleteCallback);
		}
		else
		{
			// Assign the completion callback
			JSED._addOnCompleteCallback(src, onCompleteCallback);

			// Create a script element for the .jsed file. 
			var scriptElement = document.createElement('script');

			if (async)
			{
				scriptElement.async = '';
			}

			scriptElement.src = src;

			// Append the script element to the head section of the current
			// HTML page. This will execute the script tag, which in turn 
			// will parse the supplied data and finally call on the completion
			// callback.
			document.head.appendChild(scriptElement);
		}

	}
	
	static clearState(src)
	{
		// Clear the state for a specific src. This might be handy if 
		// one wishes to free memory.

		if (src in JSED._parsedData)
		{
			delete JSED._parsedData[src];
		}

		if (src in JSED._onCompleteCallbacks)
		{
			delete JSED._onCompleteCallbacks[src];
		}
	}

	static async execute(fileFormat, encodingsString, encodedData)
	{
		// This method is called when the script generated by JSED.parse() hase been loaded and
		// actually parses the data. After the data has been converted a completion callback is 
		// called.

		/* The arguments:
				scriptElement =				The script HTML tag that calls this method.

				fileFormat =				The file format of the encoded data. 

				encodingsString =			A string of encoding methods, delimeted by the null bytes 
											character ("\0"), that have been used to encode the data.
											The order of the methods is such that the data should be
											decoded from left to right.

				encodedData =				The JSED encoded data as a string. This is the data that will
											be parsed.

		*/

		// Get the script element that called execute.
		// Store the original skipStackDepth, then change it to 2 and finally revert to original
		// By changing the skipStackDepth to 2, we get the script that called this function. If
		// skipStackDepth = 1, then currentExecutingScript() == this script (not what we want).
		var orgSkipStackDepth = currentExecutingScript.skipStackDepth;
		currentExecutingScript.skipStackDepth = 2;
		var scriptElement = currentExecutingScript();
		currentExecutingScript.skipStackDepth = orgSkipStackDepth;

		// Get the source of the currently executing script.
		var src = scriptElement.getAttribute('src');

		// Split the input parameters which represents lists.
		var encodings = encodingsString.split(JSED._encodingsDelimeter).filter(String);

		// Loop through the encodings and decode accordingly.
		for (var i = 0; i < encodings.length; i++)
		{
			var encoding = encodings[i].trim();
			encodedData = await JSED._decode(encoding, encodedData);
		}

		// The encoded data has now been decoded.
		var decodedData = encodedData;

		// Parse the decodedData data.
		var convertedObject = await JSED._parseFile(fileFormat, decodedData);

		// Store the data and call all the corresponding onComplete callbacks.
		JSED._parsedData[src] = convertedObject;
		JSED._callOnCompleteCallbacks(src);
	}

	static setDecodingFunction(encoding, decodeFunction)
	{
		// Set a decoding function for an encoding.
		// The function should take a string as argument
		// and should return a string.

		encoding = encoding.toLowerCase();
		JSED._decodingFunctions[encoding] = decodeFunction;
	}

	static setDecodingFunctionForMany(encodings, decodingFunction)
	{
		for (var i = 0; i < encodings.length; i++)
		{
			JSED.setDecodingFunction(encodings[i], decodingFunction);
		}
	}

	static setFileFormatParsingFunction(fileFormat, parsingFunction)
	{
		// Set a conversion function for a conversion function name.
		// The conversion function takes the following arguments:
		// decodedData (string), fileNames (array of strings), 
		// fileExtensions(array of strings). The conversion function
		// returns a JavaScript object.

		fileFormat = fileFormat.toLowerCase();
		JSED._fileFormatParsingFunctions[fileFormat] = parsingFunction;
	}

	static setFileFormatParsingFunctionForMany(fileFormats, parsingFunction)
	{
		for (var i = 0; i < fileFormats.length; i++)
		{
			JSED.setFileFormatParsingFunction(fileFormats[i], parsingFunction);
		}
	}

	static _callOnCompleteCallbacks(src)
	{
		// Call all callbacks that corresponds to src.

		if (src in JSED._onCompleteCallbacks)
		{
			var callbacks = JSED._onCompleteCallbacks[src];

			for (var i = 0; i < callbacks.length; i++)
			{
				callbacks[i](JSED._parsedData[src]);
			}
		}
	}
	static _addOnCompleteCallback(src, onCompleteCallback)
	{
		// Add a onCompleteCallback that corresponds to src.

		if (!(src in JSED._onCompleteCallbacks))
		{
			JSED._onCompleteCallbacks[src] = [];
		}

		JSED._onCompleteCallbacks[src].push(onCompleteCallback);
	}

	static async _decode(encoding, encodedData)
	{
		// This function decodes data encoded with some encoding. The input
		// data is a string and so is the returned data. Throws an error
		// if a decoding method for the inputted encoding has not been 
		// implemented.

		/* The arguments:
				encoding =	The encoding with which the data has been encoded.
							The value is case-insensitive.
			
				data =		The data to be decoded. The type is string.
		*/

		encoding = encoding.toLowerCase();
		if (encoding in JSED._decodingFunctions)
		{
			return await JSED._decodingFunctions[encoding](encodedData);
		}

		throw new Error("Error! Decoding for the encoding: '" + encoding + "' has not been implemented.");
	}

	static async _parseFile(fileFormat, fileData)
	{
		// This function parses file data to a JavaScript
		// representation. For example, JSONs will be parsed to 
		// objects, while .txts will be parsed to plain strings.
		// Throws an error if a parsing function has not been 
		// implemented for the requested file format. 

		/* The arguments:
				fileFormat =	The file format of the data that is to be parsed.

				fileData =		The data that is to be parsed as a string.
		*/

		fileFormat = fileFormat.toLowerCase();
		if (fileFormat in JSED._fileFormatParsingFunctions)
		{
			return await JSED._fileFormatParsingFunctions[fileFormat](fileData);
		}

		throw new Error("Error! Parsing function for the file format: '" + fileFormat + "' has not been implemented.");
	}



}

// The JSED encodings delimeter.
JSED._encodingsDelimeter = ",";

// Dictionaries that store the state of parsed JSED files and their corresponding callbacks. 
// By storing the results, we can avoid decoding the same file twice.
JSED._parsedData = {};
JSED._onCompleteCallbacks = {};

// Dictionaries of functions that are used in the JSED parsing process.
JSED._decodingFunctions = {};
JSED._fileFormatParsingFunctions = {};

// Decoding function implementations

JSED.setDecodingFunction('base64', async function (encodedData)
{
	return atob(encodedData);
});

JSED.setDecodingFunctionForMany(['txt', 'text'], async function (encodedData)
{
	return encodedData;
});

// File format parsing function implementations

JSED.setFileFormatParsingFunction('json', async function (data)
{
	return JSON.parse(data);
});

JSED.setFileFormatParsingFunction('html', async function (data)
{
	var div = document.createElement('div');
	div.innerHTML = data.trim();

	return div.firstChild;
});

JSED.setFileFormatParsingFunction('csv', async function (data)
{
	return Papa.parse(data, { dynamicTyping: true, header: true, skipEmptyLines: true }).data;
});

JSED.setFileFormatParsingFunction('zip', async function (data)
{
	function zipEntryOnCompleteCallbackGenerator(fileName, fileExtension, result, zipEntryPromiseResolve)
	{
		return async function (fileData)
		{
			result[fileName] = await JSED._parseFile(fileExtension, fileData);

			zipEntryPromiseResolve();
		}
	}

	var bytes = new Uint8Array(data.length);
	for (var i = 0; i < data.length; i++)
		bytes[i] = data.charCodeAt(i);

	var blobData = new Blob([bytes]);

	var promises = []

	var initializationPromiseResolve = null;
	var initializationPromise = new Promise(function (resolve, reject)
	{
		initializationPromiseResolve = resolve;
	});

	promises.push(initializationPromise);

	var result = {};

	zip.createReader(new zip.BlobReader(blobData), function (reader)
	{
		reader.getEntries(function (entries)
		{
			if (entries.length)
			{
				for (var i = 0; i < entries.length; i++)
				{
					var entry = entries[i];
					var zipEntryPromiseResolve = null;
					var zipEntryPromise = new Promise(function (resolve, reject)
					{
						zipEntryPromiseResolve = resolve;
					});

					promises.push(zipEntryPromise);

					var entryFileName = entry.filename;
					var entryFileExtension = "";

					if(entryFileName.includes('.'))
					{
						var split = entryFileName.split('.');
						entryFileExtension = split[split.length - 1];
					}

					entry.getData(new zip.TextWriter(), zipEntryOnCompleteCallbackGenerator(entryFileName, entryFileExtension, result, zipEntryPromiseResolve),
						function (current, total)
						{
							// progress callback
						});
				}

			}

			initializationPromiseResolve();

		});
	});

	for (var i = 0; i < promises.length; i++)
	{
		await promises[i];
	}


	return result;
});

JSED.setFileFormatParsingFunctionForMany(['txt', 'text', ''], async function (data)
{
	return data;
});
