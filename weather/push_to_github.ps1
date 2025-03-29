# Replace this with your actual GitHub username and repository name
$username = "paulelliotco"
$reponame = "MCP"

# Add the remote and push
git remote add origin "https://github.com/$username/$reponame.git"
git push -u origin master

Write-Host "If you see an error about authentication, you may need to:"
Write-Host "1. Create a personal access token on GitHub (Settings > Developer settings > Personal access tokens)"
Write-Host "2. Use that token as your password when prompted"
