const open = require("open");
const axios = require("axios");
const { format, add } = require("date-fns");
const notifier = require("node-notifier");
const player = require("play-sound")((opts = {}));

const lookupTable = new Map([
  [
    "arena",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158431",
  ],
  [
    "tempelhof",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158433",
  ],
  [
    "messe",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158434",
  ],
  [
    "velodrom",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158435",
  ],
  [
    "tegel",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158436",
  ],
  [
    "erika",
    "https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158437",
  ],
]);
const rateLimit = 1000 * 5;

function log(...msg) {
  console.log(new Date().toISOString(), ...msg);
}

function error(msg) {
  console.error(new Date().toISOString(), msg);
}

function updateLinkDate(link) {
  return link.replace(/\d{4}-\d{2}-\d{2}/, format(new Date(), "yyyy-MM-dd"));
}

function updateLinkDatePfizer(link) {
  return link.replace(
    /\d{4}-\d{2}-\d{2}/,
    format(add(new Date(), { days: 42 }), "yyyy-MM-dd")
  );
}

async function hasSuitableDate(data, xhrLink, secondShotXhrLink) {
  try {
    if (data?.total) {
      log("More than 0 availabilities");

      if (secondShotXhrLink) {
        const secondShotData = (
          await axios.get(updateLinkDatePfizer(secondShotXhrLink))
        ).data;

        log("second shot data", secondShotData);

        return secondShotData.total !== 0;
      }
    }

    if (data?.next_slot?.startsWith("2021-05") || data?.next_slot?.startsWith("2021-06")) {
      const newData = (
        await axios.get(xhrLink.replace(/\d{4}-\d{2}-\d{2}/, data.next_slot))
      ).data;

      log("further checking for specific later date", xhrLink);

      for (availability of newData.availabilities) {
        if (availability.slots.length > 0) {
          log("More than one slot when requesting for new Date");
          return true;
        }
      }
    }

    if (data?.availabilities?.length) {
      for (availability of data.availabilities) {
        if (availability.slots.length > 0) {
          log("More than one slot");
          return true;
        }
      }
    }
  } catch (e) {
    throw e;
  }
  return false;
}

function notify() {
  console.log("\u0007");

  notifier.notify({
    title: "Vacination",
    message: "Appointment!",
  });

  player.play("./bell-ring-01.wav", function (err) {
    if (error) {
      error(err);
    }
  });
}

function observe(xhrLink, bookingLink, secondShotXhrLink) {
  function reschedule(time) {
    setTimeout(function () {
      observe(xhrLink, bookingLink);
    }, Math.ceil(time || Math.random() * 1000));
  }

  log("checking directly");
  axios
    .get(updateLinkDate(xhrLink))
    .then(async function (response) {
      try {
        const isSuitable = await hasSuitableDate(
          response?.data,
          xhrLink,
          secondShotXhrLink
        );
        if (isSuitable) {
          log("direct success", response.data, bookingLink);

          open(bookingLink);

          notify();

          // 2 Minutes break
          reschedule(1000 * 60 * 2);

          return;
        }
      } catch (e) {
        error(e);
      }
      reschedule(rateLimit);
    })
    .catch(function (e) {
      error(e);
      reschedule(rateLimit);
    });
}

let recentlyOpened = false;
function observeImpfstoff() {
  if (!recentlyOpened) {
    log("checking impfstoff.link");

    axios
      .get("https://api.impfstoff.link/?robot=1")
      .then(function (response) {
        response?.data?.stats.forEach(function (stat) {
          if (stat.open === false) {
            return;
          }

          if (lookupTable.has(stat?.id)) {
            open(lookupTable.get(stat.id));
          } else {
            return;
          }

          log("impfstuff success", stat.id);

          recentlyOpened = true;
          setTimeout(function () {
            recentlyOpened = false;
          }, 60000);

          notify();
        });
      })
      .catch(error);
  }

  setTimeout(observeImpfstoff, rateLimit);
}

const data = [
  /*
    Comment back in the places you want to be checked

    bookingLink: the doctolib link where a human can book an appointment
    xhrLink: the link to doctolib's api where booking availabilty gets checked.
             You can find this link in the debugger console of your browser. The date will get automatically corrected to the current date

    secondShotXhrLink: Some places want you to book a second shoot immediatly, if they don't have a slot for a second appointment, you can't book at all.
                       So in this cases it makes sense to check this second appointment as well
  */

  {
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2537716&agenda_ids=397976-397975-457951-457902-457907-457924-457947-457971-457964-404655-457956-457952-457903-457912-457916-457928-457976-457901-457922-457927-457936-457970-457930-457967-457975-457917-457933-457946-457961-457945-457955-457940-457953-457968-457920-457960-457963-457906-457973-457977-457931-457943-457954-457915-457913-457918-457938-457939-457935-457979-457966-457944-457910-397977-457959-457926-457941-457923-457937&insurance_sector=public&practice_ids=158437&destroy_temporary=true&limit=4`,
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158437`, //erika
  },

  {
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2495719&agenda_ids=397846-457477-457405-457414-457511-457432-457563-457569-457439-457493-457453-457406-457416-457400-457404-457409-457419-457420-457427-457483-457425-457428-457415-457504-457597-457566-457457-457436-457596-457591-457443-457487-457594-457408-457421-457435-457489-457567-457418-457426-457448-457412-457463-397845-397844-457411-457497-457424-457429-457430-457442-457470-404659-457407-457410-457593&insurance_sector=public&practice_ids=158434&destroy_temporary=true&limit=4`,
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158434`, // messe
  },
  {
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2733996&agenda_ids=56915&insurance_sector=public&practice_ids=22563&destroy_temporary=true&limit=4`,
    bookingLink: `https://www.doctolib.de/praxis/berlin/hno-praxis-rafael-hardy?insurance_sector=public`,
  },
  {
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158431`, //areana
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2495719&agenda_ids=457609-457690-457696-457705-457721-457618-457621-457626-457627-457633-457635-457636-457640-457642-457643-457647-457649-457655-457656-457657-457659-457661-457663-457667-457674-457686-457694-457700-457701-457702-457703-457704-457708-457715-457719-457720-457724-457738-457739-457740-457742-457744-457745-457746-397776-402408-397800-457617-457619-457620-457622-457623-457625-457628-457629-457631-457632-457644-457646-457652-457654-457658-457664-457666-457675-457679-457681-457684-457685-457688-457689-457691-457693-457697-457698-457706-457707-457709-457710-457713-457714-457718-457743-457747-457637-457639-457645-457648-457662-457676-457677-457678-457687-457699-457722-457723&insurance_sector=public&practice_ids=158431&destroy_temporary=true&limit=4`,
  },
  {
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158435`, //velodrome
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2495719&agenda_ids=404654-457215-457244-457299-457212-457216-457291-457296-457312-457280-397973-457243-457208-397972-457210-457239-457213-457278-457283-457304-457306-457229-457234-457288-457315-457227-457204-457237-397974-457206-457310-457319-457218-457245-457274-457321&insurance_sector=public&practice_ids=158435&destroy_temporary=true&limit=4`,
  },
  {
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158436`, // tegel biotech
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2495719&agenda_ids=457323-457329-457334-457346-457253-457255-457256-457399-457388-457263-457266-457277-457286-457320-457343-457268-457500-457382-457385-457324-457460-457251-397843-457264-457271-457279-457290-457292-457318-457327-457341-457293-457250-457265-457313-457413-457379-457374-457294-457317-457335-457514-457350-457326-457330-457254-457267-457303-457275-457276-457281-457289-457300-457301-457302-457307-457309-457314-457331-457355-457515-457338-457287-457308-397841-457512-457513-457285-457392-457395-457252-457358-457305-457377-457396-457333-457349-457316-457352-457295-457390-457363-457282-457297-397842-457336-457337-404656-457510&insurance_sector=public&practice_ids=158436&destroy_temporary=true&limit=4`,
  },
  {
    bookingLink: `https://www.doctolib.de/institut/berlin/ciz-berlin-berlin?pid=practice-158436`, // tegel moderna
    xhrLink: `https://www.doctolib.de/availabilities.json?start_date=2021-05-21&visit_motive_ids=2537716&agenda_ids=465550-465598-465601-465615-465553-465594-465630-465678-465575-465653-466144-466139-466141-466153-466127-466143-466151-465558-465580-465582-465619-466146-465526-465527-465592-465651-465543-466157-465701-465532-465609-466128-466129-466130-466131-466132-466133-466134-466135-466136-466137-466138-466140-466145-466147-466148-466149-466150-466152-466154-466155-466156-466158-466159-466160-466161-465555-465584-465534&insurance_sector=public&practice_ids=158436&destroy_temporary=true&limit=4`,
  },
];

data.forEach(function (links) {
  observe(links.xhrLink, links.bookingLink);
});

// Comment back in to observe impfstoff.link for availabilities.
// observeImpfstoff();

log("Started checking periodically...");
log(
  "Just keep it running, it will play a sound and open a browser when an appointment opens up"
);
