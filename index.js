const Discord = require('discord.js');
const fetch = require('node-fetch');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const { getChannel } = require('./utils');


const newSubscriber = async (req, res) => {
	const client = new Discord.Client();

	client.on('ready', () => {
		if (req.body.list_id.includes(7)) {
			const channel = getChannel(client, 'général');
			channel.send(`🎉  ${req.body.email} vient de s’abonner !`);
		}
		res.status(200).end();
	});

	client.login(process.env.DISCORD_TOKEN);
}


const shareReport = async (_, res) => {
	const client = new Discord.Client();

	client.on('ready', async () => {
		const API_URL = 'https://api.sendinblue.com/v3';

		const response1 = await fetch(`${API_URL}/emailCampaigns?limit=1&status=sent`, {
		  headers: {
		    'accept': 'application/json',
		    'content-type': 'application/json',
		    'api-key': process.env.SENDINBLUE_KEY
		  }
		});
		const campaign = (await response1.json()).campaigns[0];

		const response2 = await fetch(`${API_URL}/emailCampaigns/${campaign.id}`, {
		  headers: {
		    'accept': 'application/json',
		    'content-type': 'application/json',
		    'api-key': process.env.SENDINBLUE_KEY
		  }
		});
		const report = await response2.json();

		const stats = report.statistics.globalStats;

		const format = (nb) => nb.toLocaleString('de-DE', { maximumFractionDigits: 2 });

		const embed = new Discord.MessageEmbed()
			.setColor('#FF9485')
			.setAuthor('📈  Stats du dernier numéro')
			.setTitle(report.subject)
			.addField('\u200B\n' + `📬  ${stats.delivered} destinataires`, '\u200B')
			.addFields(
				{
					name: '👁️  Taux d’ouverture',
					value: `**${format(100 * stats.uniqueViews / stats.delivered)} %** (${stats.uniqueViews})` + '\n\u200B',
				},
				{
					name: '🖱️  Taux de clic',
					value: `**${format(100 * stats.uniqueClicks / stats.delivered)} %** (${stats.uniqueClicks})` + '\n\u200B',
				},
				{
					name: '💧  Taux d’attrition',
					value: `**${format(100 * stats.unsubscriptions / stats.delivered)} %** (${stats.unsubscriptions})`,
				}
			);

		const channel = getChannel(client, 'général');
		channel.send(embed);

		res.status(200).end();
	});

	client.login(process.env.DISCORD_TOKEN);
}


const shareReportUlule = async (_, res) => {
	const BASE_URL = 'https://api.ulule.com/v1';

	const campaign = await fetch(`${BASE_URL}/projects/le-point-q`, {
		headers: {
			'Authorization': `APIKey ${process.env.ULULE_KEY}`
		}
	}).then((r) => r.json());

	const client = new Discord.Client();

	client.on('ready', async () => {
		const embed = new Discord.MessageEmbed()
			.setColor('#5E017D')
			.setTitle(`🚀 Crowdfunding (J - ${parseInt(campaign.time_left)})`)
			.setURL('https://ulule.com/le-point-q/')
			.addFields(
				{
					name: '💸 Montant récolté',
					value: `**${campaign.committed} €** (${campaign.percent} % de l’objectif)` + '\n\u200B',
				}
			)
			.addField(`💌 ${campaign.supporters_count} contributeur·rice·s`, '\u200B')
			.setImage(campaign.image);

		const channel = getChannel(client, 'crowdfunding');
		channel.send(embed);
	});

	client.login(process.env.DISCORD_TOKEN);
	
	res.status(200).end();
}


const checkUlule = async (_, res) => {
	const client = new Discord.Client();

	const BASE_URL = 'https://api.ulule.com/v1';

	const campaign = await fetch(`${BASE_URL}/projects/le-point-q`, {
		headers: {
			'Authorization': `APIKey ${process.env.ULULE_KEY}`
		}
	}).then((r) => r.json());

	const storage = new Storage({ keyFilename: 'key.json' });

	const { ordersCount, commentsCount, datetime } = JSON.parse(
		(await storage.bucket('data-discord').file('data-ulule.json').download())[0].toString()
	);

	console.log(`Contributeur·rice·s : ${campaign.orders_count} (+${campaign.orders_count - ordersCount})`);
	console.log(`Commentaires & réponses : ${campaign.comments_count} (+${campaign.comments_count - commentsCount})`);

	if (campaign.orders_count === ordersCount && campaign.comments_count === commentsCount) {
		return res.status(200).end();
	}

	client.on('ready', async () => {
		const channel = getChannel(client, 'crowdfunding');

		// Nouvelles contributions
		if (campaign.orders_count > ordersCount) {
			const orders = (await fetch(`${BASE_URL}/projects/le-point-q/orders`, {
				headers: {
					'Authorization': `APIKey ${process.env.ULULE_KEY}`
				}
			}).then((r) => r.json())).orders.filter((d) => !d.refunded);

			// const newOrders = orders.slice(0, orders.length - ordersCount).reverse();

			const newOrders = orders.filter((order) => new Date(order.created_at).getTime() > new Date(datetime).getTime()).reverse();
			console.log(`${newOrders.length} nouvelle(s) contribution(s)...`);
			
			newOrders.forEach((order) => {
				const name = order.user.name;
				const amount = order.order_total;
				const rewards = order.items && order.items.map(({ reward }) => reward.parent ? reward.parent.title.fr : reward.title.fr);

				const formatList = (arr) => arr.length > 1
					? `${arr.slice(0, -1).join(', ')} & ${arr.slice(-1)[0]}`
					: arr[0];
				
				if (rewards && rewards.length > 0) {
					channel.send(`💜 ${name} vient de commander ${formatList(rewards)} pour ${amount} € !`);
				}
				else {
					channel.send(`💜 ${name} vient de donner ${amount} € sans contrepartie !`);
				}
			});
		}

		// Nouveaux commentaires
		if (campaign.comments_count > commentsCount) {
			const comments = (await fetch(`${BASE_URL}/projects/le-point-q/comments`, {
				headers: {
					'Authorization': `APIKey ${process.env.ULULE_KEY}`
				}
			}).then((r) => r.json())).comments;

			// const repliesCountNew = comments.reduce((acc, comment) => acc + comment.replies_count, 0);

			// const newComments = comments.slice(0, campaign.comments_count - (repliesCountNew - repliesCount) - commentsCount).reverse();

			const newComments = comments.filter((comment) => new Date(comment.submit_date).getTime() > new Date(datetime).getTime());
			console.log(`${newComments.length} nouveau(x) commentaire(s)...`);

			newComments.forEach(({ comment, user }) => {	
				channel.send(`💬 ${user.name.replace(/_/g, '\\_')} vient de déposer un commentaire :\n_« ${comment} »_`);
			});
		}

		if (campaign.orders_count > ordersCount) {
			await shareReportUlule(_, res);
		}

		await storage.bucket('data-discord')
			.file('data-ulule.json')
			.save(JSON.stringify({
				ordersCount: campaign.orders_count,
				commentsCount: campaign.comments_count,
				// repliesCount: repliesCountNew,
				datetime: new Date().toISOString()
			}, null, '\t'));
	});

	client.login(process.env.DISCORD_TOKEN);

	return res.status(200).end();
}


module.exports = {
	newSubscriber,
	shareReport,
	shareReportUlule,
	checkUlule
};
