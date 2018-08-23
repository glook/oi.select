angular.module('selectDemo')
    .controller('infiniteScrollController', function ($scope) {
        $scope.oiOptions = 'item.name for item in get($query,$page) track by item.id';
        $scope.get = (query, page = 0) => {
            const pagesize = 10;
            const result = [
                {
                    "id": "5b733552bd4c57ca54ab20d2",
                    "name": "Anita"
                },
                {
                    "id": "5b7335529028c88297b916ed",
                    "name": "Thomas"
                },
                {
                    "id": "5b733552a55888246bb9c466",
                    "name": "Perkins"
                },
                {
                    "id": "5b7335526e99b1240b7396e5",
                    "name": "Greta"
                },
                {
                    "id": "5b7335529ea1285f5d7ae8e7",
                    "name": "Mcpherson"
                },
                {
                    "id": "5b73355260dd78abba78c06c",
                    "name": "Olson"
                },
                {
                    "id": "5b7335527ccabe13e6d85e8c",
                    "name": "Ana"
                },
                {
                    "id": "5b733552791190607c3a1c09",
                    "name": "Mamie"
                },
                {
                    "id": "5b73355205849a885d094931",
                    "name": "Velazquez"
                },
                {
                    "id": "5b733552ae8e5fbb7eb98ba5",
                    "name": "Helena"
                },
                {
                    "id": "5b7335520ff686fc57ec5256",
                    "name": "Mann"
                },
                {
                    "id": "5b7335529b5459cddea318bf",
                    "name": "Roberts"
                },
                {
                    "id": "5b733552711e4b3e2341a4b8",
                    "name": "Eleanor"
                },
                {
                    "id": "5b733552cd8c020c15f0aa29",
                    "name": "Aida"
                },
                {
                    "id": "5b7335526a49c64d317d666d",
                    "name": "Janine"
                },
                {
                    "id": "5b733552a68e0fa1bc944ddd",
                    "name": "Rita"
                },
                {
                    "id": "5b7335527ca1c7da6baa94eb",
                    "name": "Jana"
                },
                {
                    "id": "5b733552ee738c2470cc6d65",
                    "name": "Audrey"
                },
                {
                    "id": "5b73355213a376d8c1f2e0d8",
                    "name": "Frank"
                },
                {
                    "id": "5b7335523105e37a1811c90f",
                    "name": "Moore"
                },
                {
                    "id": "5b7335527b8c2a501e7a9db5",
                    "name": "Shana"
                },
                {
                    "id": "5b733552be3e635ee743a102",
                    "name": "Holland"
                },
                {
                    "id": "5b733552bd237b6928cafad0",
                    "name": "Monroe"
                },
                {
                    "id": "5b733552c238b69f33e38557",
                    "name": "Bernadette"
                },
                {
                    "id": "5b733552c42961825c81d36b",
                    "name": "Suzette"
                },
                {
                    "id": "5b7335522981b7c2ad6a7da1",
                    "name": "Kline"
                },
                {
                    "id": "5b7335529c7656bfeb7154db",
                    "name": "Lauri"
                },
                {
                    "id": "5b7335520265004e75f749a4",
                    "name": "Nash"
                },
                {
                    "id": "5b733552b14fe639aa7ce5be",
                    "name": "Diann"
                },
                {
                    "id": "5b733552f6ad61af3762364e",
                    "name": "Gayle"
                },
                {
                    "id": "5b733552afbeb8fa486687c4",
                    "name": "Earnestine"
                },
                {
                    "id": "5b73355219be0dd8fe8b1240",
                    "name": "Bridges"
                },
                {
                    "id": "5b733552060fd2296d7278a9",
                    "name": "Gordon"
                },
                {
                    "id": "5b733552f5ce5147dac5c63c",
                    "name": "Knowles"
                },
                {
                    "id": "5b733552af6460ca4f3cdb5c",
                    "name": "Calderon"
                },
                {
                    "id": "5b733552751c64692be2cc7a",
                    "name": "Lamb"
                },
                {
                    "id": "5b73355282efa3088e9408e4",
                    "name": "Tammy"
                },
                {
                    "id": "5b73355296384e6022657123",
                    "name": "Patrick"
                },
                {
                    "id": "5b733552677dfe3d5cc9c99c",
                    "name": "Robyn"
                },
                {
                    "id": "5b7335525975de8650791d53",
                    "name": "Mckinney"
                },
                {
                    "id": "5b733552fbd64a66e90035df",
                    "name": "Lupe"
                },
                {
                    "id": "5b733552e5bd6278c811423f",
                    "name": "Iris"
                },
                {
                    "id": "5b7335522247fe3e5beb9049",
                    "name": "Gonzalez"
                },
                {
                    "id": "5b7335526d6cad7384ac8afa",
                    "name": "Elva"
                },
                {
                    "id": "5b7335526f6158460ca7314d",
                    "name": "Matthews"
                },
                {
                    "id": "5b733552fbf29a09fd16e45a",
                    "name": "Eddie"
                },
                {
                    "id": "5b73355230fe8faddb185879",
                    "name": "Maddox"
                },
                {
                    "id": "5b7335524be3b9c0b83fa66c",
                    "name": "Baker"
                },
                {
                    "id": "5b7335528f844e0e0603ea6e",
                    "name": "Lolita"
                },
                {
                    "id": "5b733552e494c24eb50fa061",
                    "name": "Lesley"
                },
                {
                    "id": "5b73355267f6b39259c10319",
                    "name": "Hardy"
                },
                {
                    "id": "5b733552864d38fbc44805ed",
                    "name": "Singleton"
                },
                {
                    "id": "5b7335521526bd72dc09b478",
                    "name": "Swanson"
                },
                {
                    "id": "5b7335525440755b371b8c42",
                    "name": "Bridget"
                },
                {
                    "id": "5b733552eb4a1d4ab8458388",
                    "name": "Paulette"
                },
                {
                    "id": "5b7335523269f1519276d600",
                    "name": "Dianna"
                },
                {
                    "id": "5b733552918b4e68d5a78ff4",
                    "name": "Lillie"
                },
                {
                    "id": "5b7335520da346c34fd02115",
                    "name": "Dona"
                },
                {
                    "id": "5b7335528e8e297b9f9f9257",
                    "name": "Ayala"
                },
                {
                    "id": "5b733552c48583749f717f33",
                    "name": "Bonnie"
                },
                {
                    "id": "5b733552a9ed768e8a6aa282",
                    "name": "Marcella"
                },
                {
                    "id": "5b733552c8ccd22ecc86aa57",
                    "name": "Summer"
                },
                {
                    "id": "5b7335522ebdba1023cccd85",
                    "name": "Claire"
                },
                {
                    "id": "5b733552fb577f57d8bd9def",
                    "name": "Gilmore"
                },
                {
                    "id": "5b733552655c9553446a8335",
                    "name": "Isabella"
                },
                {
                    "id": "5b733552b041dc9ccdcadd80",
                    "name": "Alvarez"
                },
                {
                    "id": "5b733552ed66c55dd6e138bd",
                    "name": "Parrish"
                },
                {
                    "id": "5b733552104e3512485a405f",
                    "name": "Landry"
                },
                {
                    "id": "5b7335526589d3afe7181506",
                    "name": "Cameron"
                },
                {
                    "id": "5b733552bc5ecab9ddb6a124",
                    "name": "Hickman"
                },
                {
                    "id": "5b733552d46a2ec6a101129d",
                    "name": "Chapman"
                },
                {
                    "id": "5b73355231eb85b41083b728",
                    "name": "Pansy"
                },
                {
                    "id": "5b733552c914e286fec10aee",
                    "name": "Jessie"
                },
                {
                    "id": "5b7335525721626bb7598179",
                    "name": "Hinton"
                },
                {
                    "id": "5b7335529e0a5582fa0cd918",
                    "name": "Moss"
                },
                {
                    "id": "5b7335525bb72ec99bf9aa01",
                    "name": "Hope"
                },
                {
                    "id": "5b7335521c5befb4d5f8fd3b",
                    "name": "Raquel"
                }
            ];
            return result.slice(page * pagesize,
                (page * pagesize) + pagesize - 1);
        };
        $scope.bundle =  {
            "id": "5b7335521c5befb4d5f8fd3b",
            "name": "Raquel"
        };
    })
;
