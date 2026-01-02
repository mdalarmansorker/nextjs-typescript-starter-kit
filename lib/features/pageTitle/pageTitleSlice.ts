import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface PageTitleState {
  pageTitle: string
}

const initialState: PageTitleState = {
  pageTitle: ''
}

export const pageTitleSlice = createSlice({
  name: 'pageTitle',
  initialState,
  reducers: {
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload
    }
  }
})

export const { setPageTitle } = pageTitleSlice.actions

export default pageTitleSlice.reducer
