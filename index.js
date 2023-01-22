const { readFile } = require('fs').promises;
const pdfParse = require('pdf-parse');
const hf = require('huggingface-api');
const skillsapi = require("emsi-skills-api");
require('./env.js');

let resumeData = {};

const file = readFile('./portfolio1.pdf');

const find_name = (full_field) => {
        for (let i = 0; i<full_field.length; i++) {
            if(full_field[i].entity_group == 'PER')
            {
                resumeData.name = full_field[i].word;
                while(full_field[i+1] && full_field[i].end == full_field[i+1].start && full_field[i+1].entity_group == 'PER')
                {
                    i++;
                    resumeData.name += full_field[i].word;
                }
                resumeData.name = resumeData.name.replace(/#/g, '');

                return;
            }    
        }
        resumeData.name = "No Name Found";
}

const find_location = (full_field) => {
    for (let i = 0; i<full_field.length; i++) {
        if(full_field[i].entity_group == 'LOC')
        {
            resumeData.location = full_field[i].word;
            while(full_field[i+1] && full_field[i].end == full_field[i+1].start && full_field[i+1].entity_group == 'LOC')
            {
                i++;
                resumeData.location += full_field[i].word;
            }
            if (full_field[i+1] && full_field[i+1].entity_group == 'LOC')
            {
                resumeData.location += ", ";
                resumeData.location += full_field[i+1].word;
                while(full_field[i+1] && full_field[i].end == full_field[i+1].start && full_field[i+1].entity_group == 'LOC')
                {
                    i++;
                    resumeData.location += full_field[i].word;
                }   
            }
            resumeData.location = resumeData.location.replace(/#/g, '');
            return;
        }    
    }
    resumeData.location = "No Location Found";
}

const find_phone = (dat) => {

    let spaced_num = /(\(?\d{3}\)?)([ .-])(\d{3})([ .-])(\d{4})/.exec(dat);
    let _prefix = /[+]\d{2}/.exec(dat);
    if (_prefix)
    {
        dat = dat.replace(_prefix, '');
    }
    let unspaced_num = /\d{10}/.exec(dat);

    if (spaced_num) 
    { 
        resumeData.phone_number = spaced_num[0]; 
    } 
    else if (unspaced_num) 
    {
        resumeData.phone_number = unspaced_num[0]; 
    }
    else 
    { 
        resumeData.phone_number = "No PhoneNumber"; 
    }
    resumeData.phone_number = _prefix ? _prefix + resumeData.phone_number : resumeData.phone_number;
    return;
}

const find_portfolio_link = (dat) => {
    let _link = new Set(dat.match(/([\w+]+\:\/\/)?([\w\d-]+\.)*[\w-]+[\.\:]\w+([\/\?\=\&\#\.]?[\w-]+)*\/?/gm));
    _link = Array.from(_link);

    while (_link && resumeData.email.includes(_link[0])) 
    { 
        _link.splice(0, 1); 
    }
    while (_link && !/[a-zA-Z]/.test(_link[0])) 
    { 
        _link.splice(0, 1); 
    }

    resumeData.portfolio_link = _link ? _link[0] : "No Portfolio Link"; 
    
    return;
}

const find_email = (dat) => {

    let _email = /([a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/.exec(dat);
    
    if (_email) { resumeData.email = _email[0]; }
    else { resumeData.email = "No Email Found"; }

    return;
}

const skills_array = elem => elem.entity_group == 'MISC'

const find_skills = (dat) => {
    let skills = dat.filter(skills_array);
    skills = new Set(skills.map(inst => inst.word));
    skills = Array.from(skills);
    skills = new Set(skills.map(inst => inst.replace(/#/g,'')).filter(inst => inst.length>2));
    resumeData.skills = skills || "No Skills";
    return;
}

const find_job_description = (dat) => {
    let jd = dat.split('\n');
    let flag = 0;
    for (i of jd)
    {
        if (flag == 1)
        {
            resumeData.job_description = i;
            return;
        }
        if(i.includes(resumeData.name))
        {
            flag = 1;
        }
    }
    resumeData.job_description = "No Job Description";
}

const find_age = (dat) => {
    let age = /Age/.exec(dat);
    //only 'day month year' format
    let birth_date = /\d{2}[.\/-]\d{2}[.\/-]\d{4}/g.exec(dat);
    let birth_date_1 = /\d{4}[.\/-]\d{2}[.\/-]\d{2}/g.exec(dat);
    if (birth_date)
    {
        let birth_year = birth_date[0].substring(6, 10);
        
        let curr_date = new Date();
        let curr_year = curr_date.getUTCFullYear();
        
        resumeData.age = curr_year-birth_year;
        
        return;
    }
    else if (birth_date_1)
    {
        let birth_year_1 = birth_date_1[0].substring(0, 4);
        
        let curr_date = new Date();
        let curr_year = curr_date.getUTCFullYear();
        
        resumeData.age = curr_year-birth_year_1;
        
        return;
    }
    else if (age)
    {
        age = dat.substring(age.index+3, age.index+3+4);
        resumeData.age = age;

        return;
    }
    else
    {
        resumeData.age = "No Age Found";

        return;
    }
}

file.then((txt) => {
    pdfParse(txt)
    .then((data) => {
        file_text = data.text;
        //console.log(file_text);
        hf.request({
            text: file_text,
            model: 'dslim/bert-large-NER',
            api_key: process.env.BERT_LARGE_NER,
            return_type: 'FULL'
        }).then((res) => {
            //console.log(res);
            
            //don't change the order of these function calls
            find_name(res);
            find_job_description(file_text);
            find_location(res);
            find_email(file_text);
            find_phone(file_text);
            find_skills(res);
            find_portfolio_link(file_text);
            find_age(file_text);

            //The above find_skills function can find some skills but not
            //all This api call can find more skills, you can comment
            //this out if you don't want to use the api, however you
            //will not find some of the skills then
            skillsapi.extract.extractFromDocument({ documentText: file_text, version:'latest' }).then((skill_res) => {
            skill_res = skill_res.data;
            let skill_name = skill_res.map(inst => inst.skill.name);
            resumeData.skills = new Set(skill_name);
            console.log(resumeData);
            })
        })
    })
})
