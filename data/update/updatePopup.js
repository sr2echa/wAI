document.getElementById('yesBtn').addEventListener('click', async () => {
    // Fetch the latest release information
    const releaseResponse = await fetch('https://api.github.com/repos/sr2echa/ThottaThukiduven/releases/latest');
    const releaseData = await releaseResponse.json();
    const downloadLink = releaseData.zipball_url;

    // Download the updated extension
    chrome.downloads.download({
        url: downloadLink,
        filename: 'ThottaThukiduven-Updated.zip'
    });

    document.getElementById('mainHeading').innerText = 'You have downloaded the latest version of the extension';
    document.getElementById('message').style.display = 'none';
    document.getElementById('yesBtn').style.display = 'none';
    document.getElementById('noBtn').style.display = 'none';
    document.getElementById('instruction').style.display = 'block';
    document.getElementById('closeBtn').style.display = 'block';
});

document.getElementById('noBtn').addEventListener('click', () => {
    window.close();
});

document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
});
