# Lighthouse Monitor

Run lighthouse check against a list of urls and save json output into reports folder. Setup urls to check in lighthouserc.json, check [crontab](https://crontab.guru/) for cron schedule expressions.

Examples:

```
30 2 * * *  # run every night at 2:30
*/5 * * * * # run every 5 minutes
```

## Run

```
npm install
npm start
```
