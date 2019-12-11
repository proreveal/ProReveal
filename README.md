# ProReveal

ProReveal is a proof-of-concept system to realize our new visual analytics concept, **Progressive Visual Analaytics with Safeguards**.
Our concept aims to provide a means for managing the uncertainty of intermediate knowledge gathered from progressive data exploration.
Specifically, our system allows people to leave PVA-Guards on their uncertain intermediate knowledge, so that it can be verified during or after the analysis.
We implement seven low-level PVA-Guards—namely, *Value*', *Rank*, *Range*, *Comparative*, *Power Law*, *Normal*, and *Linear*.
Our paper is under review for publication in IEEE TVCG. The paper and demo videos will be released after the review process.

![The ProReveal Interface](https://github.com/proreveal/ProReveal/blob/master/images/interface.png?raw=true)


## How can I use ProReveal?

- If you are just interested in our interface, go to [our demo page](https://proreveal.github.io/ProReveal/) and proceed with the "Continue with a browser engine" option. You can explore a toy dataset and all computations will take place on the web browser.

- If you are seeking scalability, you can use a [Python backend](https://github.com/proreveal/ProReveal-Backend). Our backend employs [pandas](https://pandas.pydata.org/) as a computation engine.

- If you are seeking better scalability, you can set the backend to use [Apache Spark](https://spark.apache.org/), a distributed in-memory computing engine designed for large-scale data processing. Go to [the documentation](https://github.com/proreveal/ProReveal-Backend).

## Building and extending the client

If you want to build the ProReveal client by your own, please follow the instructions below.

1. Make sure that [node](https://nodejs.org/en/) and npm are installed. I am using node 10.16.1 and npm 6.13.3.

2. Clone this repository.

```bash
git clone https://github.com/proreveal/ProReveal.git
cd ProReveal
```

3. Install the dependencies.

```bash
npm install
```

4. (Optional) If you are using the Python backend, open `src/environments/environment.ts` and make the `apiHost` property point to your backend.

5. Run a dev server and navigate to http://localhost:4200/. The default port is 4200. 

```bash
npm start 
```

6. (Optional) If you want to build a self-contained version of ProReveal, use the `ng build` command.  
Install [Angular Cli](https://cli.angular.io/) and build the project.  

```bash
npm install -g @angular/cli
ng build --prod
```  

The output will be stored in `dist/ProReveal`. Note that the above command will use `src/environments/environment.prod.ts` instead of `environment.ts` in the same directory.

