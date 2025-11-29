window.TIMELINE_DATA = {
    "settings": {
        "start": "1990-01-01",
        "end": "2026-01-01",
        "defaultColor": "#0de7e7",
        "backgroundColor": "#2c2d2f",
        "tracks": [
            {
                "id": "career",
                "label": "Career",
                "position": "top"
            },
            {
                "id": "education",
                "label": "Education",
                "position": "top"
            },
            {
                "id": "projects",
                "label": "Side Projects",
                "position": "bottom"
            },
            {
                "id": "life",
                "label": "Life Events",
                "position": "bottom"
            }
        ]
    },
    "items": [
        {
            "id": "band-1",
            "type": "band",
            "label": "The Formative Years",
            "start": "1990-01-01",
            "end": "2008-09-01",
            "color": "#eeeeee",
            "track": "life",
            "desc": "Childhood and early education"
        },
        {
            "id": "edu-1",
            "type": "range",
            "label": "BSc Computer Science",
            "start": "2008-09-01",
            "end": "2012-06-01",
            "track": "education",
            "color": "#0de7e7",
            "style": "bar-in-label",
            "desc": "University of Technology"
        },
        {
            "id": "edu-2",
            "type": "range",
            "label": "MSc AI Systems",
            "start": "2012-09-01",
            "end": "2014-06-01",
            "track": "education",
            "color": "#0de7e7",
            "style": "bar-in-label",
            "lane": 1
        },
        {
            "id": "job-1",
            "type": "range",
            "label": "Junior Dev @ WebCorp",
            "start": "2014-07-01",
            "end": "2016-05-01",
            "track": "career",
            "color": "#c73a52",
            "style": "bar-in-label",
            "desc": "First full-time role working on PHP legacy systems."
        },
        {
            "id": "job-2",
            "type": "range",
            "label": "Senior Engineer @ TechGiant",
            "start": "2016-06-01",
            "end": "2020-03-01",
            "track": "career",
            "color": "#c73a52",
            "style": "bar-in-label",
            "url": "https://example.com/techgiant"
        },
        {
            "id": "job-3",
            "type": "range",
            "label": "Staff Engineer @ StartupX",
            "start": "2020-04-01",
            "end": null,
            "track": "career",
            "color": "#c73a52",
            "style": "bar-in-label",
            "desc": "Leading the platform infrastructure team. Ongoing."
        },
        {
            "id": "proj-1",
            "type": "range",
            "label": "Open Source Lib: 'React-Flow-X'",
            "start": "2018-01-01",
            "end": "2019-06-01",
            "track": "projects",
            "color": "#0de7e7",
            "style": "bar-below",
            "url": "https://github.com/example/lib"
        },
        {
            "id": "proj-2",
            "type": "range",
            "label": "Indie Game Project",
            "start": "2021-01-01",
            "end": null,
            "track": "projects",
            "color": "#0de7e7",
            "style": "bar-below",
            "desc": "Developing a Unity 2D platformer on weekends."
        },
        {
            "id": "life-1",
            "type": "milestone",
            "label": "Born",
            "date": "1990-05-15",
            "track": "life",
            "color": "#c73a52",
            "style": "point-label",
            "icon": "star"
        },
        {
            "id": "life-2",
            "type": "milestone",
            "label": "Moved to San Francisco",
            "date": "2016-05-20",
            "track": "life",
            "color": "#eeeeee",
            "style": "point-label",
            "desc": "Relocated for the TechGiant job."
        },
        {
            "id": "life-3",
            "type": "milestone",
            "label": "Bought First House",
            "date": "2022-08-15",
            "track": "life",
            "color": "#eeeeee",
            "style": "point-label",
            "icon": "home"
        },
        {
            "id": "life-4",
            "type": "milestone",
            "label": "Marathon Finisher",
            "date": "2019-11-04",
            "track": "life",
            "color": "#eeeeee",
            "style": "point-label",
            "desc": "NYC Marathon 2019"
        }
    ]
};
