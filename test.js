const express = require('express');
const fetch = require('node-fetch');
const { newSubscriber, shareReport } = require('./index');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/newSubscriber', newSubscriber);
app.get('/shareReport', shareReport);

app.listen(port, async () => {
	console.log(`Example app listening at http://localhost:${port}`);

	// fetch(`http://localhost:${port}/newSubscriber`, {
	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	},
	// 	method: 'POST',
	// 	body: JSON.stringify({
	// 		id: '123456',
	// 		email: 'example@domain.com',
	// 		event: 'list_addition',
	// 		key: 'xxxxxxxxxxxxxxxxxx',
	// 		list_id: [7, 1],
	// 		date: '2020-10-09 00:00:00',
	// 		ts: 1604937111
	// 	})
	// });

	fetch(`http://localhost:${port}/shareReport`);
});
