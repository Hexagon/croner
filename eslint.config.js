export default [{
    "rules": {
        "indent": [
            2,
            "tab"
        ],
        "quotes": [
            2,
            "double"
        ],
        "semi": [
            2,
            "always"
        ],
        "complexity": [
            2,
            22
        ],
        "linebreak-style": 0,
        "no-var": 1
    },
    "languageOptions": {
        "parserOptions": {
            "sourceType": "module"
        },
        "globals": {
            "define": false,
            "describe": false,
            "it": false,
            "deno": false,
            "es2017": true,
            "node": true,
            "browser": true
        },
    },
    "ignores": ["dist-legacy/*","dist/*","dist-docs/*","docs/*","test/deno/*","src/helpers/*"]
}];