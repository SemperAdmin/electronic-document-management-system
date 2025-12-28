function i(n,t="Unknown"){if(!n)return t;const{rank:m="",lastName:a="",firstName:e="",mi:r}=n;return`${m} ${a}, ${e}${r?` ${r}`:""}`.trim()||t}export{i as f};
