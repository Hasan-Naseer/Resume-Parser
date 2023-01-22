# Resume-Parser
To use the resume parser
1) npm install
2) Singup on hugging face and get api key
3) Enter api key in env.js
4) Signup on https://lightcast.io/open-skills and
  get emsi client id and emsi secret
5) Enter client id and secret in env.js
6) Enter pdf file path in env.js
7) Run the code.

Ps. The Resume Parser uses bert-large-ner pretrained model to 
extract names. In the initial run the code might give some errors 
as it takes a few seconds to load the bert-large-ner model
onto the server. Try running it a couple of times with a few
seconds gap each. Subsequent runs will run without error.
