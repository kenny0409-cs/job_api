class APIFilters {
    constructor(query, queryStr){
        this.query = query;
        this.queryStr = queryStr;
    }


    filter() {
        const querycopy = {...this.queryStr};
        
        //removing fields from the query
        const remove = ['sort','fields','que','limit','page'];
        remove.forEach(e1 => delete querycopy[e1]);
        //adavance filter using : lt, lte, gt ,gte
        let queryStr = JSON.stringify(querycopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`)
        
        this.query = this.query.find(JSON.parse(queryStr));
        
        return this;
    }

    sort() { 
        if(this.queryStr.sort) {
            const multisort = this.queryStr.sort.split(',').join(' ');
            console.log(multisort);
            this.query = this.query.sort(this.queryStr.sort);
        }
        else {//posting the latest job at the top if not giving any value
            this.query = this.query.sort('-postingDate');
        }

        return this;
    }

    //limiting fields for jobs
    limit()
    {
        if(this.queryStr.fields)
        {
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
            console.log(fields);
        }
        else{
            this.query = this.query.select('-__v')
        }
        return this;
    }

    //Search by query
    searchByQuery()
    {
        if(this.queryStr.q){
            const qu = this.queryStr.q.split('-').join(' ');
            this.query = this.query.find({$text: {$search: "\""+ qu +"\""}});
        }


        return this;
    }

    pagination()
    {
        const page = parseInt(this.queryStr.page, 10) || 1;
        const limit = parseInt(this.queryStr.limit, 10) || 10;
        const skipresult = (page-1) * limit; //if page= 2 and limit=5,we will get 5 which means we will skip the result from 1-5 and get result starting from 6 
        

        this.query = this.query.skip(skipresult).limit(limit);

        return this;
    }

}

module.exports = APIFilters;