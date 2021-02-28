$(document).ready(() =>
  $('.emailbutton').click(() => {
    const validator = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
    const email = $('#footeremail').val()
    const name = $('#footername').val()
    const emailIsValid = validator.test(email)
    const isString = s => typeof s === 'string'
    const isUnderMaxLength = (max, s) => s.length < max
    const noLineBreak = s => !s.includes('\n')
    const noBars = s => !s.includes('|')
    const nameValidator = name => isString(name) && isUnderMaxLength(60, name) && noLineBreak(name) && noBars(name)
    const nameIsValid = nameValidator(name)
    // const validationTest = {}
    // validationTest["a@a"] = nameIsValid("a@a")
    // validationTest["a@a.a"] = nameIsValid("a@a.a")
    // validationTest["asdasdasd@|"] = nameIsValid("asdasdasd@|")
    // validationTest["asdasdasd@awa.co\n"] = nameIsValid("asdasdasd@awa.co\n")
    // alert(JSON.stringify(validationTest))
    if (!email.includes('|') && emailIsValid && nameIsValid) {
      const opts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name: btoa(name), email: btoa(email)})
      }
      fetch('http://173.230.150.218:8083/api', opts)
        .then(res => res.text())
        .then(r => {
          $('.invalid').hide()
          $('.success').show()
          $('.emailbutton').toggle('disabled')
        })
        .catch(e => {
          $('.success').hide()
          $('.invalid').text('Request failed. Is it your internet or is it our server?')
          $('.invalid').show()
          console.error(e)
        })
    } else {
      $('.success').hide()
      $('.invalid').show()
    }

  }))