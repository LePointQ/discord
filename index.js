const Discord = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const { getChannel } = require('./utils');


exports.newSubscriber = async (req, res) => {
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


exports.shareReport = async (req, res) => {
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
			.setColor('#F47B67')
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
