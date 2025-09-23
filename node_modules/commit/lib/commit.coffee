options = {m:''}
exec = require('child_process').exec
sys = require('sys')


execGitCommit = (cb)->
	puts = (error, stdout, stderr)=>
		if error then @cb(error, null)
		sys.puts(stdout) 

		cb(null, stdout);
	if options.m 
		cmd = "git commit -m '"+options.m+"'" 
		exec(cmd, puts)	
		console.log(String(cmd).green.bold.inverse);
	else 
		console.log('Please enter a commit message'.red.bold.inverse);
		process.stdin.resume()
		process.stdin.setEncoding('utf8')
		process.stdin.on('data', (chunk) ->
			# cb(new Error('error'))
			if chunk is '\n' 
				process.stdin.pause()
				execGitCommit(cb)
			else
				options.m += chunk
		)
 
module.exports = execGitCommit