const Discord = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const fs = require('fs');

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


let ordersCount = 8;
let commentsCount = 4;

const checkUlule = async (_, res) => {
	const client = new Discord.Client();

	const BASE_URL = 'https://api.ulule.com/v1';

	const campaign = await fetch(`${BASE_URL}/projects/le-point-q`, {
		headers: {
			'Authorization': `APIKey ${process.env.ULULE_KEY}`
		}
	}).then((r) => r.json());

	if (campaign.orders_count === ordersCount && campaign.comments_count === commentsCount) {
		return res.status(200).end();
	}

	client.on('ready', async () => {
		const channel = getChannel(client, 'crowdfunding');

		if (campaign.orders_count > ordersCount) {
			const orders = (await fetch(`${BASE_URL}/projects/le-point-q/orders`, {
				headers: {
					'Authorization': `APIKey ${process.env.ULULE_KEY}`
				}
			}).then((r) => r.json())).orders.filter((d) => !d.refunded);
	
			const newOrders = orders.slice(0, orders.length - ordersCount).reverse();
			
			newOrders.forEach((order) => {	
				const name = order.user.name;
				const amount = order.order_total;
				const reward = order.items && order.items.length > 0 && order.items[0].reward;
				
				if (reward) {
					const rewardName = reward.parent ? reward.parent.title.fr : reward.title.fr;
					channel.send(`💜 ${name} vient de commander ${rewardName} pour ${amount} € !`);
				}
				else {
					channel.send(`💜 ${name} vient de donner ${amount} € sans contrepartie !`);
				}
			});
			ordersCount = campaign.orders_count;
			await shareReportUlule(_, res);
		}

		if (campaign.comments_count > commentsCount) {
			const comments = (await fetch(`${BASE_URL}/projects/le-point-q/comments`, {
				headers: {
					'Authorization': `APIKey ${process.env.ULULE_KEY}`
				}
			}).then((r) => r.json())).comments;

			const newComments = comments.slice(0, comments.length - commentsCount).reverse();

			newComments.forEach(({ comment, user }) => {	
				channel.send(`💬 ${user.name} vient de déposer un commentaire :\n_« ${comment} »_`);
			});
		}
		
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