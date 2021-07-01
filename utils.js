exports.getChannel = (client, name) => {
	return [...client.channels.cache.values()].find(channel => channel.name === name)
}
