module.exports = {
	"env": {
		"browser": true,
		"es6": true,
		"jquery": true,
		"node": true,
	},
	"extends": [
		"eslint:recommended",
	],
	"globals": {
		"Atomics": "readonly",
		"SharedArrayBuffer": "readonly",
		// Socket.io
		"io": "readonly"
	},
	"parserOptions": {
		"ecmaVersion": 2018
	},
	"rules": {
        "array-bracket-spacing": ["error", "always"],
        "object-curly-spacing": ["error", "always"],
        "no-multi-spaces" : ["error"],
		"space-before-blocks" : ["error"],
		"block-spacing" : ["error"],
		"keyword-spacing" : ["error"],
		"no-trailing-spaces": ["error"],
		"brace-style" : ["error"],
		"curly": ["error","all"],
		"indent": ["error","tab"],
		"linebreak-style": ["error","unix"],
		"quotes": ["error","double"],
		"semi": ["error","always"]
	}
};
