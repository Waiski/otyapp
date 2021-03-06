Template.userTabsModal.helpers
  recentUsers: ->
    notabbers = Roles.getUsersInRole('notabber').map (user) -> user._id 
    Meteor.users.find {_id: $nin: notabbers}, {sort: {lastActive: -1}, limit: 15}
  searchedUsers: ->
    notabbers = Roles.getUsersInRole('notabber').map (user) -> user._id
    search = Session.get 'userSearch'
    if not search or search.length < 2
      return []
    Meteor.users.find {
      _id: $nin: notabbers
      username: {$regex: search, $options:'i'}
    }, sort: username: 1

Template.userTabsModal.onCreated ->
  # Reset so that any old values are unset
  Session.set 'drinkBeingBought', undefined
  Session.set 'userSearch', undefined

@showTabsModal = ->
  # Note: The session variable 'drinkBeingBought' must be set separately
  # The settings and refresh are required for the positioning to work
  # See: https://github.com/Semantic-Org/Semantic-UI/issues/614
  $('#tabs-modal').modal
    detachable: false
    observeChanges: true
    onVisible: ->
      search = $(@).find('#user-search')
      # underscorejs throttle is used do that the search is performed
      # max once every half second.
      search.on 'keyup', _.throttle ->
        element = $(@)
        content = element.text()
        # Clear any generated html elements
        element.empty() if not content.length
        Session.set 'userSearch', content
      , 500
      search.on 'keydown', (event) ->
        if event.keyCode is 13
          event.target.blur()
  .modal 'show'
  .modal 'refresh'

Template.tabCard.onRendered ->
  uid = @data._id
  @$('.user-tab-card').click ->
    # Remember to set this when opening the modal
    drink = Drinks.findOne Session.get 'drinkBeingBought'
    if not drink then return console.error 'Drink not found!'
    Transactions.insert
      userId: uid
      amount: drink.price
      drink:
        id: drink._id
        name: drink.name
      , (err, tid) ->
        if err
          toastr.error err.message
        else
          user = Meteor.users.findOne uid
          message = drink.name + ' added on ' + user.username + '\'s tab. '
          message += '<a class="undo"><strong>Undo</strong></a>'
          # The second argument is the title, it has to be there for the options to work
          toast = toastr.success message, '', {timeOut: 15000, extendedTimeOut: 15000}
          $('#tabs-modal').modal 'hide'
          # Add undo handler to the toast
          toast.find('.undo').click ->
            Transactions.remove tid, (err) ->
              if (err)
                toastr.error err.message
              else
                toastr.info 'Purchase undone.'
          # For possible other means of undoing
          Session.set 'lastTransactionId', tid
