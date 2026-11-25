# Eval

Measures whether Incidetective's investigation beats pasting the raw logs into the same model. Each case is a real or realistic incident with a known cause. For each case, the runner produces two answers:

- **Incidetective:** the app's own pipeline: parse, cluster errors, build the report, then `investigateWithAI()`.
- **Raw paste (baseline):** the same model gets the incident description and the raw files, cut to the end of the logs if they don't fit its context.

## Running

Needs a running Ollama with the model pulled (`OLLAMA_BASE_URL` and `OLLAMA_MODEL` from `.env`). It doesn't use the database.

```bash
npm run eval                                 # all cases
npm run eval -- --case hadoop-disk-full      # one case (repeatable)
npm run eval -- --model qwen3:14b            # another model
npm run eval -- --only app                   # skip the baseline
```

Results go to `eval/results/<date>-<model>.md` (for reading and scoring) and `.json` (raw answers). The first run of a Loghub case downloads the dataset (about 3 MB) into `eval/.cache/`.

## Scoring

Score each answer by hand in the `.md` file, 0–2 per column:

- **Cause:** names the real cause, not just a symptom.
- **Evidence:** cites the lines that prove it.
- **Next step:** gives a concrete check that would confirm it.

The "key evidence cited" line is an automatic hint: it checks whether the cited evidence contains the case's `groundTruth.keyEvidence` strings. For the app, three more hints show how focused the citations are: **IDs per hypothesis** (fewer is easier to read), **key evidence in hypothesis 1** (whether the leading hypothesis alone cites the proof), and **cited IDs with key evidence** (the share of cited IDs that contain it; a rough measure of noise, since other cited lines can still be relevant). Commit scored results with the PR that changes the analysis, as evidence that the change helped.

## Cases

| Case | Source | Size | Cause |
| --- | --- | --- | --- |
| `redis-pool` | Synthetic (the hand-test fixtures) | 7 lines + diagnostic | Redis connection pool exhausted |
| `hadoop-disk-full` | Loghub Hadoop | ~3,700 lines | Disk full on one node; WARN/FATAL only |
| `hadoop-network-disconnect` | Loghub Hadoop | ~2,000 lines | Node disconnected; datanodes unreachable |
| `hadoop-network-large` | Loghub Hadoop | ~100,000 lines | Node disconnected; AM can't reach the ResourceManager |
| `hadoop-machine-down` | Loghub Hadoop | ~4,200 lines | Node down; attempts killed on an unusable node (INFO lines only) |
| `hadoop-machine-down-pagerank` | Loghub Hadoop | ~3,900 lines | Node down; 624 INFO "Retrying connect to server" lines |

Add a case with a folder containing `case.json` (see the existing ones) and its log files. A case with a `source` downloads its logs into `data/`, which is gitignored.

## Data source and terms

The Hadoop cases use [Loghub](https://github.com/logpai/loghub)'s Hadoop dataset ([Zenodo record 8196385](https://zenodo.org/records/8196385)): MapReduce runs with deliberately injected failures, labeled in the dataset's `abnormal_label.txt`. Loghub's logs are "freely available for research or academic work", so they are downloaded on demand instead of being committed here. Please cite:

- Jieming Zhu, Shilin He, Pinjia He, Jinyang Liu, Michael R. Lyu. *Loghub: A Large Collection of System Log Datasets for AI-driven Log Analytics.* ISSRE 2023.
- Qingwei Lin, Hongyu Zhang, Jian-Guang Lou, Yu Zhang, Xuewei Chen. *Log Clustering Based Problem Identification for Online Service Systems.* ICSE 2016.
